'use client'
import React from 'react';

export default function DNABackground() {
  // Create 25 pairs for the helix
  const pairs = Array.from({ length: 25 }, (_, i) => i);

  return (
    <div className="dna-container">
      {/* Left Helix */}
      <div className="dna-helix" style={{ left: '5%' }}>
        {pairs.map((i) => (
          <React.Fragment key={i}>
            <div 
              className="dna-dot strand-1" 
              style={{ top: `${i * 60}px`, animationDelay: `${i * 0.15}s` }} 
            />
            <div 
              className="dna-dot strand-2" 
              style={{ top: `${i * 60}px`, animationDelay: `${i * 0.15 + 4}s` }} 
            />
            <div 
              className="dna-line" 
              style={{ top: `${i * 60 + 8}px`, left: '50%', transform: 'translateX(-50%)', animationDelay: `${i * 0.15}s` }} 
            />
          </React.Fragment>
        ))}
      </div>
      
      {/* Right Helix */}
      <div className="dna-helix" style={{ left: '90%', transform: 'rotateZ(-15deg)', opacity: 0.6 }}>
        {pairs.map((i) => (
          <React.Fragment key={i}>
            <div 
              className="dna-dot strand-1" 
              style={{ top: `${i * 60}px`, animationDelay: `${i * 0.15 + 1}s`, color: 'var(--dna-purple)' }} 
            />
            <div 
              className="dna-dot strand-2" 
              style={{ top: `${i * 60}px`, animationDelay: `${i * 0.15 + 5}s`, color: 'var(--dna-pink)' }} 
            />
            <div 
              className="dna-line" 
              style={{ top: `${i * 60 + 8}px`, left: '50%', transform: 'translateX(-50%)', animationDelay: `${i * 0.15 + 1}s`, background: 'linear-gradient(90deg, var(--dna-purple), var(--dna-pink))' }} 
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
