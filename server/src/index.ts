import { createApp } from "./app";
import { config } from "./config";

createApp().listen(config.port, () => {
  console.log(`API พร้อมใช้งานที่ http://localhost:${config.port}`);
});
