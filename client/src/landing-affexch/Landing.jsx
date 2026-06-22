import Frame from "./components/Frame";
import Cursor from "./components/Cursor";
import Boot from "./components/Boot";
import Hero from "./sections/Hero";
import Numbers from "./sections/Numbers";
import PeptideOffers from "./sections/PeptideOffers";
import HowItWorks from "./sections/HowItWorks";
import Features from "./sections/Features";
import Ecosystem from "./sections/Ecosystem";
import Modules from "./sections/Modules";
import Network from "./sections/Network";
import NeuralMatch from "./sections/NeuralMatch";
import CTA from "./sections/CTA";
import { CityProvider } from "./city/CityContext";
import CitySelectModal from "./city/CitySelectModal";
import ApplicationFormModal from "./city/ApplicationFormModal";

export default function Landing() {
  return (
    <CityProvider>
      <Boot />
      <Cursor />
      <Frame />

      <main>
        <Hero />
        <Numbers />
        <PeptideOffers />
        <HowItWorks />
        <Features />
        <Ecosystem />
        <Modules />
        <Network />
        <NeuralMatch />
        <CTA />
      </main>

      <div className="fx-grain" />
      <div className="fx-scanlines" />
      <div className="fx-vignette" />

      <CitySelectModal />
      <ApplicationFormModal />
    </CityProvider>
  );
}
