import { Link } from "@tanstack/react-router";
import { Laptop, Mail, MapPin, Phone } from "lucide-react";

export function Footer() {
  const laptopCollections = [
    "Gaming Laptop",
    "Coding & Programming",
    "Creator & Design",
    "Business Laptop",
    "Student Laptop",
  ];

  return (
    <footer className="mt-16 bg-foreground text-background">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg gradient-ai text-primary-foreground">
              <Laptop className="size-4" />
            </span>
            <span className="text-lg font-bold">LaptopAI Store</span>
          </div>
          <p className="text-sm opacity-80">
            Intelligent Laptop Shopping Experience powered by AI. 70 verified models, honest specs, zero hype.
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Laptop Collections</p>
          {laptopCollections.map((c) => (
            <Link
              key={c}
              to="/shop"
              search={{ category: c } as never}
              className="block opacity-80 hover:opacity-100"
            >
              {c}
            </Link>
          ))}
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Support & Tools</p>
          <Link to="/orders" className="block opacity-80 hover:opacity-100">
            Track Order
          </Link>
          <Link to="/compare" className="block opacity-80 hover:opacity-100">
            Compare Laptops
          </Link>
          <Link to="/admin" className="block opacity-80 hover:opacity-100">
            Laptop Management
          </Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Contact</p>
          <p className="flex items-center gap-2 opacity-80">
            <Mail className="size-4" /> hello@laptopai.store
          </p>
          <p className="flex items-center gap-2 opacity-80">
            <Phone className="size-4" /> +62 21 555 0199
          </p>
          <p className="flex items-center gap-2 opacity-80">
            <MapPin className="size-4" /> Jakarta, Indonesia
          </p>
        </div>
      </div>
      <div className="border-t border-background/15 py-4 text-center text-xs opacity-70">
        © 2026 LaptopAI Store. Intelligent Laptop Shopping Experience powered by AI.
      </div>
    </footer>
  );
}
