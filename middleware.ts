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
import { trace } from "@opentelemetry/api";

function withTraceParent(res: NextResponse) {
    const spanContext = trace.getActiveSpan()?.spanContext();
    if (spanContext)
        res.cookies.set("traceparent", `00-${spanContext.traceId}-${spanContext.spanId}-0${spanContext.traceFlags}`);
    return res;
};
export async function middleware(req: NextRequest) {
    console.log("Middleware", [req.nextUrl, trace.getActiveSpan()?.spanContext(), req.headers.get("traceparent"), req.cookies.get("traceparent")?.value]);

    //if (!req.headers.get("traceparent")) {
    //    req.headers.append("traceparent", req.cookies.get("traceparent")?.value ?? new RandomIdGenerator().generateTraceId());

    //}

    if (req.nextUrl.pathname.startsWith('/_next')) {
        return withTraceParent(NextResponse.next());
    }
      
    req.headers.append("x-url", req.url);
    
    var rsp = I18nMiddleware(req);
     
    return withTraceParent(rsp);

}
//https://medium.com/rescale/optimizing-next-js-with-opentelemetry-f80b8028b0e3
