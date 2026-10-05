package com.solargridx.mobile.scan

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solargridx.mobile.api.ApiClient
import com.solargridx.mobile.api.QrVerificationApi
import com.solargridx.mobile.common.ApiError
import com.solargridx.mobile.common.ApiResult
import com.solargridx.mobile.common.safeApiCall
import com.solargridx.mobile.dto.QrVerifyRequest
import com.solargridx.mobile.dto.QrVerifyResponse
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** Scan → preview (read-only) → confirm (completes). */
sealed interface ScanState {
    data object Checking : ScanState
    data class Ready(val booking: QrVerifyResponse) : ScanState
    data class Confirming(val booking: QrVerifyResponse) : ScanState
    data class Completed(val booking: QrVerifyResponse) : ScanState
    data class Refused(val error: ApiError) : ScanState
}

class QrPreviewViewModel(
    private val api: QrVerificationApi = ApiClient.retrofit.create(QrVerificationApi::class.java)
) : ViewModel() {

    private val _state = MutableStateFlow<ScanState>(ScanState.Checking)
    val state: StateFlow<ScanState> = _state.asStateFlow()
    private var started = false

    /** POST /qr/preview: runs every check without completing anything. */
    fun preview(token: String) {
        if (started) return
        started = true
        viewModelScope.launch {
            _state.value = when (val result = safeApiCall { api.preview(QrVerifyRequest(token)) }) {
                is ApiResult.Success -> ScanState.Ready(result.data)
                is ApiResult.Failure -> ScanState.Refused(result.error)
            }
        }
    }

    /** POST /qr/verify: completes the transfer. Only reachable after a successful preview. */
    fun confirm(token: String) {
        val booking = (_state.value as? ScanState.Ready)?.booking ?: return
        _state.value = ScanState.Confirming(booking)
        viewModelScope.launch {
            _state.value = when (val result = safeApiCall { api.verify(QrVerifyRequest(token)) }) {
                is ApiResult.Success -> ScanState.Completed(result.data)
                is ApiResult.Failure -> ScanState.Refused(result.error)
            }
        }
    }
}
