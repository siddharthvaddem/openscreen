import { createApp } from "./app.js";
import { config } from "./config.js";

const app = createApp();

app.listen(config.port, () => {
	console.log(`[Auto Screen Backend] listening on http://localhost:${config.port}`);
});
