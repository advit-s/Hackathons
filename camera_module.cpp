#include "camera_module.h"
#include "pins_config.h"
#include "edge_sentinel.h"

bool camera_init() {
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer   = LEDC_TIMER_0;
    config.pin_d0       = CAM_PIN_D0;
    config.pin_d1       = CAM_PIN_D1;
    config.pin_d2       = CAM_PIN_D2;
    config.pin_d3       = CAM_PIN_D3;
    config.pin_d4       = CAM_PIN_D4;
    config.pin_d5       = CAM_PIN_D5;
    config.pin_d6       = CAM_PIN_D6;
    config.pin_d7       = CAM_PIN_D7;
    config.pin_xclk     = CAM_PIN_XCLK;
    config.pin_pclk     = CAM_PIN_PCLK;
    config.pin_vsync    = CAM_PIN_VSYNC;
    config.pin_href     = CAM_PIN_HREF;
    config.pin_sscb_sda = CAM_PIN_SIOD;
    config.pin_sscb_scl = CAM_PIN_SIOC;
    config.pin_pwdn     = CAM_PIN_PWDN;
    config.pin_reset    = CAM_PIN_RESET;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;

    // Configure based on PSRAM availability
    if (psramFound()) {
        config.frame_size  = CAM_FRAME_SIZE;
        config.jpeg_quality = CAM_JPEG_QUALITY;
        config.fb_count    = CAM_FB_COUNT;
        config.grab_mode   = CAMERA_GRAB_LATEST;
        Serial.println("[CAM] PSRAM found — using VGA, 2 frame buffers");
    } else {
        config.frame_size  = FRAMESIZE_CIF;    // 400x296 fallback
        config.jpeg_quality = 14;
        config.fb_count    = 1;
        config.grab_mode   = CAMERA_GRAB_LATEST;
        Serial.println("[CAM] No PSRAM — using CIF, 1 frame buffer");
    }

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("[CAM] FAIL — init error 0x%x\n", err);
        return false;
    }

    // Configure sensor settings for security use
    sensor_t *s = esp_camera_sensor_get();
    if (s) {
        s->set_brightness(s, 1);    // Slightly brighter
        s->set_contrast(s, 1);      // Slightly more contrast
        s->set_saturation(s, 0);    // Normal saturation
        s->set_whitebal(s, 1);      // Auto white balance ON
        s->set_awb_gain(s, 1);      // AWB gain ON
        s->set_wb_mode(s, 0);       // Auto WB mode
        s->set_aec2(s, 1);          // Auto exposure ON
        s->set_gainceiling(s, (gainceiling_t)6);  // Higher gain for low light
    }

    // Initialize flash LED pin
    pinMode(FLASH_LED_PIN, OUTPUT);
    digitalWrite(FLASH_LED_PIN, LOW);

    Serial.println("[CAM] OK — Camera initialized");
    return true;
}

camera_fb_t* camera_capture_jpeg() {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
        Serial.println("[CAM] FAIL — capture returned null");
        return nullptr;
    }
    Serial.printf("[CAM] Captured JPEG: %u bytes\n", fb->len);
    return fb;
}

void camera_return_frame(camera_fb_t* fb) {
    if (fb) {
        esp_camera_fb_return(fb);
    }
}

void flash_led_on() {
    digitalWrite(FLASH_LED_PIN, HIGH);
}

void flash_led_off() {
    digitalWrite(FLASH_LED_PIN, LOW);
}
