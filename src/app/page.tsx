import { About } from "@/components/About";
import { EventTypes } from "@/components/EventTypes";
import { Footer } from "@/components/Footer";
import { Gallery } from "@/components/Gallery";
import { GetInvolved } from "@/components/GetInvolved";
import { Hero } from "@/components/Hero";
import { Membership } from "@/components/Membership";
import { Navbar } from "@/components/Navbar";
import { Team } from "@/components/Team";

/** Board + gallery are edited live in /admin */
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <EventTypes />
        <Gallery />
        <Membership />
        <GetInvolved />
        <Team />
      </main>
      <Footer />
    </>
  );
}
