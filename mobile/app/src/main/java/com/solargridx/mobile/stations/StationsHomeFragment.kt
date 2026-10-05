package com.solargridx.mobile.stations

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import androidx.core.view.isVisible
import androidx.core.widget.doAfterTextChanged
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.android.gms.maps.model.MarkerOptions
import com.google.android.gms.tasks.CancellationTokenSource
import com.google.android.material.button.MaterialButton
import com.google.android.material.chip.ChipGroup
import com.google.android.material.textfield.TextInputEditText
import com.solargridx.mobile.BuildConfig
import com.solargridx.mobile.R
import com.solargridx.mobile.common.StateViews
import com.solargridx.mobile.common.UiState
import com.solargridx.mobile.reservations.ui.collectWhileStarted

/**
 * Stations tab. A searchable list, nearest first once the user allows coarse
 * location, and a map of the same stations when a Maps key is configured. Only
 * stations with a slot open to book are listed.
 */
class StationsHomeFragment : Fragment(R.layout.fragment_stations_home) {

    companion object {
        const val ARG_STATION_ID = "stationId"
        private const val MAP_TAG = "stationsMap"
    }

    private val viewModel: StationsViewModel by viewModels()
    private var googleMap: GoogleMap? = null
    private var latest: StationsData? = null

    private val locationPermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) locate() else showNote(getString(R.string.stations_location_denied))
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val list = view.findViewById<RecyclerView>(R.id.stationList)
        val mapContainer = view.findViewById<View>(R.id.mapContainer)
        val viewChips = view.findViewById<ChipGroup>(R.id.viewChips)
        val states = StateViews(view) { viewModel.load() }
        val adapter = StationAdapter { open(it.station.id) }
        list.layoutManager = LinearLayoutManager(requireContext())
        list.adapter = adapter

        // The map is optional: without a key there is only the list.
        viewChips.isVisible = BuildConfig.MAPS_ENABLED
        viewChips.setOnCheckedStateChangeListener { _, ids ->
            val showMap = ids.firstOrNull() == R.id.chipMap
            mapContainer.isVisible = showMap
            list.isVisible = !showMap
            if (showMap) ensureMap()
        }

        view.findViewById<MaterialButton>(R.id.locationButton).setOnClickListener { requestLocation() }

        val search = view.findViewById<TextInputEditText>(R.id.searchInput)
        search.setText(viewModel.query)
        search.doAfterTextChanged {
            viewModel.query = it?.toString().orEmpty()
            latest?.let { data -> render(data, adapter, states) }
        }

        collectWhileStarted(viewModel.state) { state ->
            when (state) {
                is UiState.Loading -> states.showLoading()
                is UiState.Error -> states.showError(state.error)
                is UiState.Content -> {
                    latest = state.data
                    render(state.data, adapter, states)
                }
            }
        }

        viewModel.loadIfNeeded()
        // Sort by distance straight away if the user already allowed it.
        if (savedInstanceState == null && hasLocationPermission()) locate()
    }

    private fun render(data: StationsData, adapter: StationAdapter, states: StateViews) {
        val items = StationGeo.sorted(data.stations.filter { StationGeo.matches(it, viewModel.query) }, data.location?.lat, data.location?.lng)
        adapter.submitList(items)
        if (items.isEmpty()) states.showEmpty(getString(R.string.stations_empty_title), getString(R.string.stations_empty_body), R.drawable.ic_res_pin)
        else states.hide()
        if (data.location != null) {
            showNote(
                if (data.farAway) getString(R.string.stations_far_away_note, StationsViewModel.NEARBY_RADIUS_KM)
                else getString(R.string.stations_nearby_note, StationsViewModel.NEARBY_RADIUS_KM)
            )
        }
        drawMarkers(items)
    }

    private fun open(stationId: String) {
        findNavController().navigate(R.id.action_stationsHome_to_stationDetail, bundleOf(ARG_STATION_ID to stationId))
    }

    // ---- location ----

    private fun hasLocationPermission() =
        ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

    private fun requestLocation() {
        if (hasLocationPermission()) locate() else locationPermission.launch(Manifest.permission.ACCESS_COARSE_LOCATION)
    }

    @SuppressLint("MissingPermission") // checked by hasLocationPermission() before every call
    private fun locate() {
        if (!hasLocationPermission()) return
        LocationServices.getFusedLocationProviderClient(requireActivity())
            .getCurrentLocation(Priority.PRIORITY_BALANCED_POWER_ACCURACY, CancellationTokenSource().token)
            .addOnSuccessListener { location ->
                if (!isAdded) return@addOnSuccessListener
                if (location == null) showNote(getString(R.string.stations_location_unavailable))
                else viewModel.load(UserLocation(location.latitude, location.longitude))
            }
            .addOnFailureListener { if (isAdded) showNote(getString(R.string.stations_location_unavailable)) }
    }

    private fun showNote(text: String) {
        view?.findViewById<TextView>(R.id.locationNote)?.apply {
            this.text = text
            isVisible = true
        }
    }

    // ---- map ----

    private fun ensureMap() {
        val existing = childFragmentManager.findFragmentByTag(MAP_TAG) as? SupportMapFragment
        val mapFragment = existing ?: SupportMapFragment.newInstance().also {
            childFragmentManager.beginTransaction().replace(R.id.mapContainer, it, MAP_TAG).commitNow()
        }
        mapFragment.getMapAsync { map ->
            googleMap = map
            map.uiSettings.isZoomControlsEnabled = true
            map.setOnInfoWindowClickListener { marker -> (marker.tag as? String)?.let(::open) }
            latest?.let { data ->
                drawMarkers(StationGeo.sorted(data.stations.filter { StationGeo.matches(it, viewModel.query) }, null, null))
            }
        }
    }

    private fun drawMarkers(items: List<StationDistance>) {
        val map = googleMap ?: return
        map.clear()
        if (items.isEmpty()) return
        val bounds = LatLngBounds.Builder()
        items.forEach { item ->
            val station = item.station
            val position = LatLng(station.latitude, station.longitude)
            map.addMarker(MarkerOptions().position(position).title(station.stationName).snippet(station.location))?.tag = station.id
            bounds.include(position)
        }
        latest?.location?.let { bounds.include(LatLng(it.lat, it.lng)) }
        runCatching { map.moveCamera(CameraUpdateFactory.newLatLngBounds(bounds.build(), 120)) }
    }

    override fun onDestroyView() {
        googleMap = null
        super.onDestroyView()
    }
}
