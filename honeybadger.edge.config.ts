import Honeybadger from "@honeybadger-io/js";
import {
  honeybadgerEnvironment,
  honeybadgerRevision,
  honeybadgerServerApiKey,
  shouldConfigureHoneybadger,
} from "@/lib/observability/honeybadger";

const apiKey = honeybadgerServerApiKey();

if (!Honeybadger.config.apiKey && shouldConfigureHoneybadger(apiKey)) {
  Honeybadger.configure({
    apiKey,
    environment: honeybadgerEnvironment(),
    revision: honeybadgerRevision(),
    projectRoot: "webpack://_N_E/./",
    reportData: false,
  });
}

export default Honeybadger;
