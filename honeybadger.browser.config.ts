import { Honeybadger } from "@honeybadger-io/react";
import {
  honeybadgerBrowserApiKey,
  honeybadgerEnvironment,
  honeybadgerRevision,
  shouldConfigureHoneybadger,
} from "@/lib/observability/honeybadger";

const apiKey = honeybadgerBrowserApiKey();

if (!Honeybadger.config.apiKey && shouldConfigureHoneybadger(apiKey)) {
  Honeybadger.configure({
    apiKey,
    environment: honeybadgerEnvironment(),
    revision: honeybadgerRevision(),
    projectRoot: "webpack://_N_E/./",
    reportData: false,
  });
}
