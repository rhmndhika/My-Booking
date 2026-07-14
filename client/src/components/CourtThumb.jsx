const CourtThumb = ({ image, alt, height, children }) => {
  return (
    <div className="court-thumb" style={height ? { height } : undefined}>
      {children}
      {image ? (
        <img src={image} alt={alt} loading="lazy" />
      ) : (
        <svg
          className="court-thumb-mark"
          width="80"
          height="80"
          viewBox="0 0 56 56"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="4" y="4" width="48" height="48" rx="8" stroke="currentColor" strokeWidth="1.2" />
          <line x1="28" y1="4" x2="28" y2="52" stroke="currentColor" strokeWidth="1.2" />
          <line x1="4" y1="28" x2="52" y2="28" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 4" />
          <circle cx="28" cy="28" r="6" stroke="currentColor" strokeWidth="0.8" fill="none" />
          <circle cx="28" cy="28" r="2" fill="currentColor" />
          <line x1="10" y1="4" x2="10" y2="52" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
          <line x1="46" y1="4" x2="46" y2="52" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
        </svg>
      )}
    </div>
  );
};

export default CourtThumb;
