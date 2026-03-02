type Props = { params: { slug: string } };

export default function StorePage({ params }: Props) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Storefront: {params.slug}</h2>
      <div className="rounded border bg-white p-4 text-sm">Product catalog, filters, variant picker, and checkout flow render here.</div>
    </section>
  );
}
