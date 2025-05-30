'use client';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-center dark:text-white">About This Cube</h1>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-lg">
            Hello everyone!
          </p>
          
          <p>
            This is a 480-card cube featuring mostly custom cards with "weird" archetypes. 
            The custom cards represent archetypes that aren't well-defined in "real" Magic, 
            while the "reprints" are the simple, tried-and-true, "if it ain't broke, don't fix it" staples.
          </p>
          
          <p>
            The cube is a journey through Magic, with many "what ifs," references, nostalgia, and surprises. 
            My goal is to evoke those "Wow, I love this!" reactions. 😉
          </p>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">Archetypes</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>WU - Storm:</strong> Cast multiple spells in a turn to trigger powerful effects.</li>
            <li><strong>UB - Broken Cipher:</strong> Encode secrets onto creatures and gain value when they deal combat damage.</li>
            <li><strong>BR - Token Collection:</strong> Create and collect various token types for different synergies.</li>
            <li><strong>RG - Control:</strong> An unusual take on control using red and green to dominate the board.</li>
            <li><strong>GW - Vehicles:</strong> Crew powerful artifact vehicles with your creatures for strong attacks.</li>
            <li><strong>WB - Blink/ETB/Value:</strong> Flicker creatures in and out of the battlefield to accumulate triggers.</li>
            <li><strong>BG - Artifacts:</strong> Leverage artifacts for value and synergy in an unusual color combination.</li>
            <li><strong>UR - Enchantments:</strong> Use enchantments to control the game and generate value over time.</li>
            <li><strong>RW - Self-mill:</strong> Put cards from your library into your graveyard for value and synergy.</li>
            <li><strong>GU - Prowess:</strong> Cast non-creature spells to trigger bonuses on your creatures.</li>
          </ul>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">Keynotes</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>I aim for an unpowered level—synergy and making the cool cards work together is more important than winning on turn 1-2.</li>
            <li>Custom cards have a rarity symbol that reflects where they might fit in a "Modern Horizons"-style set. If you see a cracked "common," it's not from a typical set, but rarity doesn't impact at all; each card appears only once.</li>
            <li>I use a lot of A.I.-generated art, but I'm not a fan. If you have fitting art or are interested in creating some for me (paid), I'd love to talk!</li>
          </ul>
          
          <h2 className="text-2xl font-bold mt-6 mb-4">Contact & Feedback</h2>
          <p>
            Feedback is welcome on everything! If you'd like to draft, discuss, share art, or anything else, 
            I'm netn10 on mtgnexus.com (where I make a lot of custom cards) and on Reddit. 
            My email is netn10@gmail.com—don't hesitate to reach out!
          </p>
        </div>
      </div>
    </div>
  );
}
