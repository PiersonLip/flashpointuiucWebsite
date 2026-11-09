export const siteConfig = {
  name: "Flashpoint Photography Club",
  shortName: "Flashpoint",
  tagline: "UIUC's community for photographers of every skill level.",
  description:
    "Flashpoint Photography Club at the University of Illinois Urbana-Champaign — workshops, excursions, socials, and collabs for students who love photography.",
  url: "https://flashpointuiuc.com",
  schoolYear: "2026–27",

  links: {
    membershipForm: "https://forms.gle/SEZn9jdcg2dPdndF8",
    rentals: "https://rentals.flashpointuiuc.com",
    headshotsForm:
      "https://docs.google.com/forms/d/e/1FAIpQLScF2Mo-j0TYNX8bjntEP5mUMRL3uu7J3xqFLbezxb7U7FPy0w/viewform",
    discord: "https://discord.com/invite/WZ2EVgK485",
    instagram: "https://www.instagram.com/flashpointuiuc/",
    linktree: "https://linktr.ee/flashpointuiuc",
  },

  dues: {
    amount: 20,
    period: "per school year",
    note: "One-time fee for fall and spring — $20 regardless of when you join.",
  },

  duesWarning: {
    title: "Complete the form before you pay",
    body: "If you want to pay dues, you MUST complete the member sign-up form first. Please do not Venmo or Zelle our treasurer without doing this. If you have already paid without doing the form, please complete it ASAP — there is no need to pay again.",
  },

  membershipBenefits: [
    "Access to all events we host",
    "Access to all Discord channels",
    "Equipment rentals",
    "Covering expenses related to off-campus travel",
  ],

  membershipNote:
    "For more advanced trips (like visiting Chicago), we may have additional fees for attendees. Dues help us run the club — reserving space, buying equipment, or paying for gas.",

  eventTypes: [
    {
      id: "workshops",
      title: "Workshops",
      schedule: "Weekdays",
      description:
        "Learn photography styles and build skills in station-based sessions. Workshops are where members develop technique and confidence.",
      icon: "aperture",
    },
    {
      id: "excursions",
      title: "Excursions",
      schedule: "Weekends",
      description:
        "Practice what you've learned, meet new people, and explore on- and off-campus locations together.",
      icon: "compass",
    },
    {
      id: "socials",
      title: "Socials",
      schedule: "A few times a month",
      description:
        "Hang out with the team, catch up on editing, and relax in a low-key setting.",
      icon: "users",
    },
    {
      id: "collabs",
      title: "Collabs",
      schedule: "Occasionally",
      description:
        "Partner with other clubs for unique experiences that take Flashpoint beyond our own circle.",
      icon: "sparkles",
    },
  ],

  communication: {
    discord: {
      title: "Discord",
      badge: "Main hub",
      description:
        "Our #1 form of communication. All announcements are posted here. Chat, share photos, sell gear, ask questions, and more.",
    },
    instagram: {
      title: "Instagram",
      badge: "Highlights",
      description:
        "Weekly highlights and excursion recaps, plus member features.",
    },
  },

  /** Seed / fallback roster — live edits happen in /admin (board_members table). */
  board: [
    { role: "President", name: "Colin Dragan" },
    { role: "Vice President", name: "Elisha Karottu" },
    { role: "Secretary", name: "eirini" },
    { role: "Membership Director", name: "Maryam" },
    { role: "Treasurer", name: "Annya" },
    { role: "Event Coordinator", name: "mihir" },
    { role: "Media Director", name: "Eshaan" },
    { role: "Historian", name: "alexa" },
    { role: "Historian", name: "Ashley Xiao" },
    { role: "Technician", name: "Michael" },
    { role: "Advisory", name: "isaac tu" },
  ],

  nav: [
    { label: "About", href: "#about" },
    { label: "Events", href: "#events" },
    { label: "Gallery", href: "#gallery" },
    { label: "Membership", href: "#membership" },
    { label: "Join", href: "#join" },
    { label: "Team", href: "#team" },
  ],
} as const;
