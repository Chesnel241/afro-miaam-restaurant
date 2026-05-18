import { headers } from "next/headers";

export async function JsonLd({ data }: { data: unknown }) {
  const nonce = (await headers()).get("x-csp-nonce") ?? undefined;

  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003C"),
      }}
    />
  );
}
