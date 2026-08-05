export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="flex-1 p-10">
      <h1 className="text-2xl font-semibold tracking-tight">{slug}</h1>
    </main>
  );
}
