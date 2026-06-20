import Honeybadger from "@honeybadger-io/js";
import {
  honeybadgerAssetsUrl,
  honeybadgerEnvironment,
  honeybadgerRevision,
  honeybadgerServerApiKey,
  shouldConfigureHoneybadger,
} from "@/lib/observability/honeybadger";

const apiKey = honeybadgerServerApiKey();
const projectRoot = process.cwd();

if (!Honeybadger.config.apiKey && shouldConfigureHoneybadger(apiKey)) {
  Honeybadger.configure({
    apiKey,
    environment: honeybadgerEnvironment(),
    revision: honeybadgerRevision(),
    projectRoot: "webpack:///./",
    reportData: false,
  }).beforeNotify((notice) => {
    if (!notice) return;

    const assetsUrl = honeybadgerAssetsUrl();
    if (!assetsUrl) return;

    notice.backtrace.forEach((line) => {
      if (line.file) {
        line.file = line.file.replace(
          `${projectRoot}/.next/server`,
          `${assetsUrl}/..`,
        );
      }
    });
  });
}

export default Honeybadger;
