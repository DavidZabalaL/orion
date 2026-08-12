import Image from "next/image";
import logo from "../../../public/orion_fn.png";

export function OrionIcon({ size = 40 }: { size?: number }) {
  return (
    <Image
      src={logo}
      alt="Orión"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain" }}
      priority
    />
  );
}
