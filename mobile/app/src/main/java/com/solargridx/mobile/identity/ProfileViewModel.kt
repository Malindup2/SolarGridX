package com.solargridx.mobile.identity

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solargridx.mobile.api.ApiClient
import com.solargridx.mobile.api.ProsumerApi
import com.solargridx.mobile.common.ActionState
import com.solargridx.mobile.common.ApiResult
import com.solargridx.mobile.common.UiState
import com.solargridx.mobile.common.safeApiCall
import com.solargridx.mobile.dto.ProsumerResponse
import com.solargridx.mobile.dto.UpdateProsumerRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** The signed-in prosumer's profile: load, update (PUT, whole object) and self-deactivate. */
class ProfileViewModel(
    private val api: ProsumerApi = ApiClient.retrofit.create(ProsumerApi::class.java)
) : ViewModel() {

    private val _profile = MutableStateFlow<UiState<ProsumerResponse>>(UiState.Loading)
    val profile: StateFlow<UiState<ProsumerResponse>> = _profile.asStateFlow()

    private val _save = MutableStateFlow<ActionState<ProsumerResponse>>(ActionState.Idle)
    val save: StateFlow<ActionState<ProsumerResponse>> = _save.asStateFlow()

    private val _deactivate = MutableStateFlow<ActionState<ProsumerResponse>>(ActionState.Idle)
    val deactivate: StateFlow<ActionState<ProsumerResponse>> = _deactivate.asStateFlow()

    fun load(nic: String) {
        if (_profile.value !is UiState.Content) _profile.value = UiState.Loading
        viewModelScope.launch {
            _profile.value = when (val result = safeApiCall { api.get(nic) }) {
                is ApiResult.Success -> UiState.Content(result.data)
                is ApiResult.Failure -> UiState.Error(result.error)
            }
        }
    }

    fun update(nic: String, request: UpdateProsumerRequest) {
        if (_save.value is ActionState.Running) return
        _save.value = ActionState.Running
        viewModelScope.launch {
            _save.value = when (val result = safeApiCall { api.update(nic, request) }) {
                is ApiResult.Success -> {
                    _profile.value = UiState.Content(result.data)
                    ActionState.Done(result.data)
                }
                is ApiResult.Failure -> ActionState.Failed(result.error)
            }
        }
    }

    fun deactivate(nic: String) {
        if (_deactivate.value is ActionState.Running) return
        _deactivate.value = ActionState.Running
        viewModelScope.launch {
            _deactivate.value = when (val result = safeApiCall { api.deactivate(nic) }) {
                is ApiResult.Success -> ActionState.Done(result.data)
                is ApiResult.Failure -> ActionState.Failed(result.error)
            }
        }
    }

    fun consumeSave() { _save.value = ActionState.Idle }
    fun consumeDeactivate() { _deactivate.value = ActionState.Idle }
}
