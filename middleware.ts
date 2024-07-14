import { NextApiRequest, NextApiResponse } from "next";
import { NextRequest, NextResponse } from "next/server";
import { userAgent } from 'next/server'
 
import { createI18nMiddleware } from 'next-international/middleware';

//@ts-ignore
const I18nMiddleware = createI18nMiddleware({
    locales: ['da', 'en'],
    defaultLocale: 'da',
    resolveLocaleFromRequest: (request: any) => {

        // Do your logic here to resolve the locale
        return 'da'
    }
});


export const config = {
    // runtime: 'experimental-edge',
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - favicon.ico (favicon file)
         */
        // '/((?!api|_next/static|favicon.ico).*)',
        '/qr/:path*',
        '/link/:path*',
        "/profile/:path*",
        '/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt).*)'
    ]
}

async function qrRedirect(req: NextRequest, slug: string) {




    const subscribeQueueUrl = process.env.NEXT_SUBSCRIBE_QUEUE_URL!
    const _userAgent = userAgent(req);
    const payload = {
        type: "qr",
        nextUrl: req.nextUrl,
        ip: req.ip,
        geo: req.geo,
        userAgent: _userAgent,

    }
    const body = `<QueueMessage><MessageText>${JSON.stringify(payload)}</MessageText></QueueMessage>`
    let rsp = await fetch(subscribeQueueUrl, {
        method: "POST",
        body: body
    });
    const { origin, pathname } = req.nextUrl;

    if (slug.startsWith("http"))
        return NextResponse.redirect(slug, 302);

    return NextResponse.redirect(`${origin}/events/${slug}`, 302);
}
import {
    RandomIdGenerator,
} from "@opentelemetry/sdk-trace-base"
 
import { type Span, trace } from '@opentelemetry/api';

export async function otel<T>(
    fnName: string,
    fn: (...args: any[]) => Promise<T>,
    ...props: any[]
): Promise<T> {
    const tracer = trace.getTracer(fnName);
    return tracer.startActiveSpan(fnName, async (span: Span) => {
       
        try {
            return await fn(...props);
        } finally {
            span.end();
        }
    });
}

function withTraceParent(res: NextResponse) {
    const spanContext = trace.getActiveSpan()?.spanContext();
    if (spanContext) {
        res.cookies.set("traceparent", `00-${spanContext.traceId}-${spanContext.spanId}-0${spanContext.traceFlags}`);
        res.headers.set("traceparent", `00-${spanContext.traceId}-${spanContext.spanId}-0${spanContext.traceFlags}`);
    }
    return res;
};
export async function middleware(req: NextRequest) {
    return await otel("middleare", async () => {
        console.log("Middleware", [req.nextUrl, trace.getActiveSpan()?.spanContext(), req.headers.get("traceparent"), req.cookies.get("traceparent")?.value]);

        if (!req.headers.get("traceparent")) {
            const spanContext = trace.getActiveSpan()?.spanContext();
            if (spanContext)
                req.headers.append("traceparent", `00-${spanContext.traceId}-${spanContext.spanId}-0${spanContext.traceFlags}`);

        }

        if (req.nextUrl.pathname.startsWith('/_next')) {
            return withTraceParent(NextResponse.next());
        }

        req.headers.append("x-url", req.url);

        var rsp = I18nMiddleware(req);

        return withTraceParent(rsp);
    });

}
//https://medium.com/rescale/optimizing-next-js-with-opentelemetry-f80b8028b0e3
