export type ProfessionalIconName = "chart" | "globe" | "money" | "check" | "target" | "categories" | "star" | "trend" | "spark" | "microscope" | "people" | "computer" | "rocket" | "cart" | "build" | "briefcase";

const ICONS: Record<ProfessionalIconName, string> = {
  chart: "/icons/chart.svg",
  globe: "/icons/globe.svg",
  money: "/icons/money.svg",
  check: "/icons/check.svg",
  target: "/icons/target.svg",
  categories: "/icons/categories.svg",
  star: "/icons/star.svg",
  trend: "/icons/trend.svg",
  spark: "/icons/spark.svg",
  microscope: "/icons/microscope.svg",
  people: "/icons/people.svg",
  computer: "/icons/computer.svg",
  rocket: "/icons/rocket.svg",
  cart: "/icons/cart.svg",
  build: "/icons/build.svg",
  briefcase: "/icons/briefcase.svg",
};

export function ProfessionalIcon({ name, className = "", size = 24 }: { name: ProfessionalIconName; className?: string; size?: number }) {
  return <img src={ICONS[name]} width={size} height={size} alt="" aria-hidden="true" className={`object-contain ${className}`} />;
}
