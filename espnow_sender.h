#pragma once
#include <Arduino.h>
#include "edge_sentinel.h"

// =============================================================
// ESP-NOW Sender Module (ESP32-CAM → NodeMCU Gateway)
// =============================================================

bool espnow_init(const uint8_t* gateway_mac);
bool espnow_send_alert(AlertPacket* packet);
bool espnow_last_send_success();
