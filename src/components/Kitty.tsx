// Ilustrações originais do Kitty Finance (gatinha com laço), inspiradas no estilo kawaii.

export function Bow({ className = '', color = 'var(--brand-500)' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 64 40" className={className} aria-hidden="true">
      <path
        d="M32 18C25 6 8 0 4 9c-3 7 3 13 12 12-8 3-12 10-7 14 6 4 17-3 23-13 6 10 17 17 23 13 5-4 1-11-7-14 9 1 15-5 12-12-4-9-21-3-28 9z"
        fill={color}
      />
      <path d="M12 10c3-2 8 0 11 4M52 10c-3-2-8 0-11 4" stroke="white" strokeOpacity=".45" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="32" cy="20" rx="7" ry="7.5" fill={color} />
      <ellipse cx="32" cy="20" rx="7" ry="7.5" fill="black" fillOpacity=".12" />
      <ellipse cx="30" cy="17.5" rx="2.2" ry="1.6" fill="white" fillOpacity=".55" />
    </svg>
  );
}

export function Heart({ className = '', color = 'currentColor' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.6.8-1.4 2.3-2.6 4.4-2.6 3.6 0 5.7 3.8 4.2 7.2C19.5 16.4 12 21 12 21z" fill={color} />
    </svg>
  );
}

/** Mascote: gatinha branca com laço rosa e bochechas coradas. */
export function KittyMascot({ className = '', mood = 'happy' }: { className?: string; mood?: 'happy' | 'wink' }) {
  return (
    <svg viewBox="0 0 160 140" className={className} role="img" aria-label="Gatinha mascote do Kitty Finance">
      {/* orelhas */}
      <path d="M26 58 L30 14 Q32 8 38 12 L66 34 Z" fill="#fff" stroke="#3b2730" strokeWidth="4" strokeLinejoin="round" />
      <path d="M134 58 L130 14 Q128 8 122 12 L94 34 Z" fill="#fff" stroke="#3b2730" strokeWidth="4" strokeLinejoin="round" />
      <path d="M36 24 L54 36 L38 44 Z" fill="#ffd0e1" />
      <path d="M124 24 L106 36 L122 44 Z" fill="#ffd0e1" />
      {/* rosto */}
      <ellipse cx="80" cy="80" rx="66" ry="52" fill="#fff" stroke="#3b2730" strokeWidth="4" />
      {/* olhos */}
      {mood === 'wink' ? (
        <path d="M44 80 q7 -7 14 0" stroke="#3b2730" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      ) : (
        <ellipse cx="51" cy="80" rx="5.5" ry="7" fill="#3b2730" />
      )}
      <ellipse cx="109" cy="80" rx="5.5" ry="7" fill="#3b2730" />
      <circle cx="111" cy="77" r="1.8" fill="#fff" />
      {mood !== 'wink' && <circle cx="53" cy="77" r="1.8" fill="#fff" />}
      {/* bochechas */}
      <ellipse cx="40" cy="98" rx="10" ry="6" fill="#ffb3cd" opacity=".7" />
      <ellipse cx="120" cy="98" rx="10" ry="6" fill="#ffb3cd" opacity=".7" />
      {/* focinho e boquinha */}
      <path d="M74 90 q6 5 12 0 q-6 -4 -12 0z" fill="#f48fb1" />
      <path d="M80 93 v4 M80 97 q-5 5 -9 1 M80 97 q5 5 9 1" stroke="#3b2730" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      {/* bigodes */}
      <path d="M4 82 L28 86 M6 96 L28 94 M156 82 L132 86 M154 96 L132 94" stroke="#3b2730" strokeWidth="3.5" strokeLinecap="round" />
      {/* laço */}
      <g transform="translate(92 6) rotate(14)">
        <path d="M24 18C18 6 4 1 1 9c-2 6 3 11 10 10-6 3-9 8-5 11 5 3 13-3 18-11 5 8 13 14 18 11 4-3 1-8-5-11 7 1 12-4 10-10-3-8-17-3-23 9z" fill="var(--brand-500)" stroke="#3b2730" strokeWidth="3.5" strokeLinejoin="round" />
        <ellipse cx="24" cy="19" rx="6.5" ry="7" fill="var(--brand-600)" stroke="#3b2730" strokeWidth="3.5" />
      </g>
    </svg>
  );
}
