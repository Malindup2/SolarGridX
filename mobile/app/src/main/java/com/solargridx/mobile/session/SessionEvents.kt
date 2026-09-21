package com.solargridx.mobile.session

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow

object SessionEvents {
    private val _expired = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val expired: SharedFlow<Unit> = _expired

    fun notifyExpired() {
        _expired.tryEmit(Unit)
    }
}
