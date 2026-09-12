const STEPS = [
  {
    number: "01",
    title: "Log every meal",
    description:
      "Add food entries by breakfast, lunch, dinner or snack. Type it in manually, or snap a photo and let AI extract the calories and macros for you.",
  },
  {
    number: "02",
    title: "Set your goals",
    description:
      "Define daily calorie and macro targets, plus a weight goal, so every entry is measured against something that matters to you.",
  },
  {
    number: "03",
    title: "See your trends",
    description:
      "Visualize calorie, macro and micronutrient trends over time, and compare what you actually ate against your goals.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-12 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
            How it works
          </span>
          <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Three steps to eating with intention.
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step) => (
            <div key={step.number}>
              <span className="font-heading text-4xl font-extrabold text-emerald-200">
                {step.number}
              </span>
              <h3 className="mt-3 text-lg font-bold text-stone-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
