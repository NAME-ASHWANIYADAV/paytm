package com.neuralwave.munshiji;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // The WebView can only grant getUserMedia if the APP already holds RECORD_AUDIO —
        // Capacitor's onPermissionRequest grants against permissions the app has, it does not
        // reliably raise the OS dialog mid-call on every device. Ask once at launch instead,
        // so the microphone dialog appears at install-time politeness, never mid-demo.
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                    this, new String[] { Manifest.permission.RECORD_AUDIO }, 1001);
        }
    }
}
