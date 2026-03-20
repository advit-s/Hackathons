#include "sd_storage.h"
#include "FS.h"
#include "SD_MMC.h"

static int _image_counter = 0;

bool sd_init() {
    // Start SD_MMC in 1-bit mode (frees GPIO 4, 12, 13)
    // Second param = true means 1-bit mode
    if (!SD_MMC.begin("/sdcard", true)) {
        Serial.println("[SD] FAIL — Card mount failed");
        return false;
    }

    uint8_t cardType = SD_MMC.cardType();
    if (cardType == CARD_NONE) {
        Serial.println("[SD] FAIL — No card detected");
        return false;
    }

    // Create evidence directory if it doesn't exist
    if (!SD_MMC.exists("/evidence")) {
        SD_MMC.mkdir("/evidence");
    }

    // Find the next available image number
    _image_counter = sd_get_next_image_number();

    uint64_t totalBytes = SD_MMC.totalBytes();
    uint64_t usedBytes  = SD_MMC.usedBytes();
    Serial.printf("[SD] OK — %s, %.1f MB free, next image: %d\n",
        cardType == CARD_SD ? "SD" : "SDHC",
        (totalBytes - usedBytes) / 1048576.0,
        _image_counter);
    return true;
}

bool sd_save_image(const uint8_t* data, size_t len, int image_number) {
    char path[48];
    snprintf(path, sizeof(path), "/evidence/alert_%04d.jpg", image_number);

    File file = SD_MMC.open(path, FILE_WRITE);
    if (!file) {
        Serial.printf("[SD] FAIL — Cannot open %s for writing\n", path);
        return false;
    }

    size_t written = file.write(data, len);
    file.close();

    if (written != len) {
        Serial.printf("[SD] FAIL — Wrote %u of %u bytes\n", written, len);
        return false;
    }

    Serial.printf("[SD] Saved: %s (%u bytes)\n", path, len);
    return true;
}

bool sd_log_event(const char* message) {
    File logFile = SD_MMC.open("/event_log.txt", FILE_APPEND);
    if (!logFile) {
        Serial.println("[SD] FAIL — Cannot open log file");
        return false;
    }

    // Format: [millis] message
    char entry[160];
    snprintf(entry, sizeof(entry), "[%010lu] %s\n", millis(), message);
    logFile.print(entry);
    logFile.close();

    Serial.printf("[SD] Logged: %s", entry);
    return true;
}

int sd_get_next_image_number() {
    int max_num = 0;
    File dir = SD_MMC.open("/evidence");
    if (!dir || !dir.isDirectory()) return 1;

    File entry;
    while ((entry = dir.openNextFile())) {
        String name = entry.name();
        // Parse "alert_XXXX.jpg"
        if (name.startsWith("alert_") && name.endsWith(".jpg")) {
            int num = name.substring(6, 10).toInt();
            if (num > max_num) max_num = num;
        }
        entry.close();
    }
    dir.close();
    return max_num + 1;
}
