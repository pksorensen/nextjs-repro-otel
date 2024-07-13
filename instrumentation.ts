import { registerOTel } from '@vercel/otel'
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

 
export function register() {

    diag.setLogger(new DiagConsoleLogger(), process.env.OTEL_DIAGNOSTIC_DEBUG ? DiagLogLevel.ALL : DiagLogLevel.INFO);

    registerOTel({
      //  propagators: [new PKSTraceContextPropagator() ],
        instrumentationConfig: {
            fetch: {
                propagateContextUrls: [
                    'https://otlp.kjeldager.io:4318'
                ],
            },
        },
    })
}
