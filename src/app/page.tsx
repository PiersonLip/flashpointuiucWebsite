import { About } from "@/components/About";
import { EventTypes } from "@/components/EventTypes";
import { Footer } from "@/components/Footer";
import { GetInvolved } from "@/components/GetInvolved";
import { Hero } from "@/components/Hero";
import { Membership } from "@/components/Membership";
import { Navbar } from "@/components/Navbar";
import { Team } from "@/components/Team";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <EventTypes />
        <Membership />
        <GetInvolved />
        <Team />
      </main>
      <Footer />
    </>
  );
}
