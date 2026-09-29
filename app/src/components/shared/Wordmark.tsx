import { asset } from "../../utils/asset";

/** The Uwazi wordmark at the navbar's size (0.919rem tall). `.logo-img`
 *  inverts it in dark mode. One component so the navbar, the catalog header
 *  and the login screen cannot drift apart. */
export function Wordmark({ className = "" }: { className?: string }) {
  return <img src={asset("/nu-logo.svg")} alt="Uwazi" data-component="Wordmark" className={`logo-img h-[0.919rem] w-auto ${className}`} />;
}
