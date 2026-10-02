package com.solargridx.mobile.scan

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.View
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.google.zxing.BarcodeFormat
import com.journeyapps.barcodescanner.DecoratedBarcodeView
import com.journeyapps.barcodescanner.DefaultDecoderFactory
import com.solargridx.mobile.R
import com.solargridx.mobile.slots.QrTokenFormat

/**
 * Operator Scan tab (M3). Reads the prosumer's transfer QR with the camera (ZXing) and
 * hands the raw code to the preview screen. The app never decides validity itself: the
 * format check only catches obviously wrong scans before asking the server.
 */
class QrScanFragment : Fragment(R.layout.fragment_qr_scan) {

    companion object {
        const val ARG_TOKEN = "qrToken"
    }

    private var barcodeView: DecoratedBarcodeView? = null
    private var handled = false

    private val cameraPermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        showCamera(granted)
        if (granted) barcodeView?.resume()
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val scanner = view.findViewById<DecoratedBarcodeView>(R.id.barcodeView)
        barcodeView = scanner
        scanner.barcodeView.decoderFactory = DefaultDecoderFactory(listOf(BarcodeFormat.QR_CODE))
        scanner.setStatusText("")
        scanner.decodeContinuous { result ->
            val text = result.text ?: return@decodeContinuous
            if (!handled && QrTokenFormat.looksValid(text)) open(text)
        }

        view.findViewById<MaterialButton>(R.id.permissionButton).setOnClickListener {
            cameraPermission.launch(Manifest.permission.CAMERA)
        }

        val manualLayout = view.findViewById<TextInputLayout>(R.id.manualLayout)
        val manualInput = view.findViewById<TextInputEditText>(R.id.manualInput)
        view.findViewById<MaterialButton>(R.id.manualButton).setOnClickListener {
            val text = manualInput.text?.toString()?.trim().orEmpty()
            if (!QrTokenFormat.looksValid(text)) {
                manualLayout.error = getString(R.string.qr_error_malformed)
                return@setOnClickListener
            }
            manualLayout.error = null
            open(text)
        }

        if (hasCamera()) showCamera(true) else cameraPermission.launch(Manifest.permission.CAMERA)
    }

    private fun hasCamera() =
        ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED

    private fun showCamera(allowed: Boolean) {
        view?.findViewById<View>(R.id.permissionBlock)?.isVisible = !allowed
        barcodeView?.isVisible = allowed
    }

    private fun open(token: String) {
        handled = true
        barcodeView?.pause()
        findNavController().navigate(R.id.action_qrScan_to_qrPreview, bundleOf(ARG_TOKEN to token))
    }

    override fun onResume() {
        super.onResume()
        handled = false
        if (hasCamera()) barcodeView?.resume()
    }

    override fun onPause() {
        barcodeView?.pause()
        super.onPause()
    }

    override fun onDestroyView() {
        barcodeView = null
        super.onDestroyView()
    }
}
