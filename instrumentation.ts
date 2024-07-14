import { OTLPHttpJsonTraceExporter,OTLPHttpProtoTraceExporter, registerOTel } from '@vercel/otel'
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

let isRegistered = false;



import {
    createTraceState,
    isSpanContextValid,
    trace as traceApi,
} from "@opentelemetry/api";
import type {
   
    Context,
    SpanContext,
    TextMapGetter,
    TextMapPropagator,
    TextMapSetter,
} from "@opentelemetry/api";
import { isTracingSuppressed } from "@opentelemetry/core";

const VERSION = "00";

const TRACE_PARENT_HEADER = "traceparent";
const TRACE_STATE_HEADER = "tracestate";
const key = Symbol.for("x-pks");
/**
 * Same as the `W3CTraceContextPropagator` from `@opentelemetry/core`, but with
 * a workaround for RegExp issue in Edge.
 */
export class PKSTraceContextPropagator implements TextMapPropagator {
    fields(): string[] {
        return [TRACE_PARENT_HEADER, TRACE_STATE_HEADER, "cookie"];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inject(context: Context, carrier: any, setter: TextMapSetter): void {
       
        const spanContext = traceApi.getSpanContext(context);
        console.log("inject", [carrier, spanContext, context, setter, context.getValue(key)]);
        if (
            !spanContext ||
            isTracingSuppressed(context) ||
            !isSpanContextValid(spanContext)
        )
            return;

        const traceParent = `${VERSION}-${spanContext.traceId}-${spanContext.spanId
            }-0${Number(spanContext.traceFlags || 0).toString(16)}`;

        setter.set(carrier, TRACE_PARENT_HEADER, traceParent);
        if (spanContext.traceState) {
            setter.set(
                carrier,
                TRACE_STATE_HEADER,
                spanContext.traceState.serialize()
            );
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extract(context: Context, carrier: any, getter: TextMapGetter): Context {
        console.log("ExTRACT", [traceApi.getActiveSpan()?.spanContext(),carrier, context, getter, context.getValue(key)]);
        console.log(getter.keys(carrier));
        console.log(getter.get(carrier, "cookie"));
        console.log(getter.get(carrier, TRACE_PARENT_HEADER));
        context = context.setValue(key, "test");
        return context;

        //const traceParentHeader = getter.get(carrier, TRACE_PARENT_HEADER);
        //if (!traceParentHeader) return context;
        //const traceParent = Array.isArray(traceParentHeader)
        //    ? traceParentHeader[0]
        //    : traceParentHeader;
        //if (typeof traceParent !== "string") return context;
        //const spanContext = parseTraceParent(traceParent);
        //if (!spanContext) return context;

        //spanContext.isRemote = true;

        //const traceStateHeader = getter.get(carrier, TRACE_STATE_HEADER);
        //if (traceStateHeader) {
        //    // If more than one `tracestate` header is found, we merge them into a
        //    // single header.
        //    const state = Array.isArray(traceStateHeader)
        //        ? traceStateHeader.join(",")
        //        : traceStateHeader;
        //    spanContext.traceState = createTraceState(
        //        typeof state === "string" ? state : undefined
        //    );
        //}
        //return traceApi.setSpanContext(context, spanContext);
    }
}

function parseTraceParent(traceParent: string): SpanContext | null {
    const [version, traceId, spanId, traceFlags, other] = traceParent.split("-");
    if (
        !version ||
        !traceId ||
        !spanId ||
        !traceFlags ||
        version.length !== 2 ||
        traceId.length !== 32 ||
        spanId.length !== 16 ||
        traceFlags.length !== 2
    )
        return null;

    // According to the specification the implementation should be compatible
    // with future versions. If there are more parts, we only reject it if it's using version 00
    // See https://www.w3.org/TR/trace-context/#versioning-of-traceparent
    if (version === "00" && other) return null;

    return {
        traceId,
        spanId,
        traceFlags: parseInt(traceFlags, 16),
    };
}
import { BatchSpanProcessor, ConsoleSpanExporter, SimpleSpanProcessor, WebTracerProvider } from '@opentelemetry/sdk-trace-web';
export function register() {
    console.log("Instrumentation setup", [process.env.NEXT_RUNTIME, process.env.OTEL_DIAGNOSTIC_DEBUG, isRegistered]);

    if (!isRegistered /*&& process.env.NEXT_RUNTIME == "edge"*/) {
        isRegistered = true;
        diag.setLogger(new DiagConsoleLogger(), process.env.OTEL_DIAGNOSTIC_DEBUG ? DiagLogLevel.ALL : DiagLogLevel.INFO);
    
        registerOTel({
           // propagators: ["baggage", "tracecontext", new PKSTraceContextPropagator()],
           // traceExporter: new OTLPHttpProtoTraceExporter({
           //     url: 'http://otlp.kjeldager.io:4318/v1/traces',
           // }),
            spanProcessors: [
              //  new SimpleSpanProcessor(new ConsoleSpanExporter()),
                new BatchSpanProcessor(new ConsoleSpanExporter())
            ],
            instrumentationConfig: {
                fetch: {
                    propagateContextUrls: [
                        'http://otlp.kjeldager.io:4318'
                    ],
                },
            },
        })
    };
}
