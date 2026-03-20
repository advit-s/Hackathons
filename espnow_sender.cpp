#include "espnow_sender.h"
#include <WiFi.h>
#include <esp_now.h>

static bool _send_success = false;
static uint8_t _gateway_mac[6];

// Callback when data is sent
static void on_data_sent(const uint8_t *mac_addr, esp_now_send_status_t status) {
    _send_success = (status == ESP_NOW_SEND_SUCCESS);
    Serial.printf("[ESPNOW] Send %s to %02X:%02X:%02X:%02X:%02X:%02X\n",
        _send_success ? "OK" : "FAIL",
        mac_addr[0], mac_addr[1], mac_addr[2],
        mac_addr[3], mac_addr[4], mac_addr[5]);
}

bool espnow_init(const uint8_t* gateway_mac) {
    // Set WiFi to station mode (required for ESP-NOW)
    WiFi.mode(WIFI_STA);
    WiFi.disconnect();

    // Print own MAC address (useful for gateway config)
    Serial.print("[ESPNOW] Sensor MAC: ");
    Serial.println(WiFi.macAddress());

    if (esp_now_init() != ESP_OK) {
        Serial.println("[ESPNOW] FAIL — esp_now_init error");
        return false;
    }

    esp_now_register_send_cb(on_data_sent);

    // Register the gateway as a peer
    memcpy(_gateway_mac, gateway_mac, 6);
    esp_now_peer_info_t peerInfo = {};
    memcpy(peerInfo.peer_addr, _gateway_mac, 6);
    peerInfo.channel = 0;       // Use current channel
    peerInfo.encrypt = false;   // No encryption (keep it simple)

    if (esp_now_add_peer(&peerInfo) != ESP_OK) {
        Serial.println("[ESPNOW] FAIL — Could not add gateway peer");
        return false;
    }

    Serial.printf("[ESPNOW] OK — Gateway: %02X:%02X:%02X:%02X:%02X:%02X\n",
        _gateway_mac[0], _gateway_mac[1], _gateway_mac[2],
        _gateway_mac[3], _gateway_mac[4], _gateway_mac[5]);
    return true;
}

bool espnow_send_alert(AlertPacket* packet) {
    esp_err_t result = esp_now_send(_gateway_mac, (uint8_t*)packet, sizeof(AlertPacket));
    if (result != ESP_OK) {
        Serial.printf("[ESPNOW] FAIL — Send error: %d\n", result);
        return false;
    }
    // Note: actual delivery status comes in the callback
    return true;
}

bool espnow_last_send_success() {
    return _send_success;
}
