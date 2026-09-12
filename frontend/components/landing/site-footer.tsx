export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="py-8">
      <p className="text-center text-xs text-stone-500">
        © {year} Cals. All rights reserved.
      </p>
    </footer>
  );
}
