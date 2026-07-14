import { useState, useRef, useCallback, useEffect } from "react";
import { LeftOutlined, RightOutlined, ZoomInOutlined, ZoomOutOutlined, CloseOutlined } from "@ant-design/icons";

const apiUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5001";

const resolveSrc = (img) => (img.startsWith("http") ? img : `${apiUrl}${img}`);

const CourtGallery = ({ images = [] }) => {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });
  const imgRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);

  const go = useCallback((dir) => {
    setZoomed(false);
    setZoom(1);
    setPos({ x: 0, y: 0 });
    setActive((p) => {
      const next = p + dir;
      if (next < 0) return images.length - 1;
      if (next >= images.length) return 0;
      return next;
    });
  }, [images.length]);

  const toggleZoom = () => {
    if (zoomed) {
      setZoom(1);
      setPos({ x: 0, y: 0 });
      setZoomed(false);
    } else {
      setZoom(2);
      setZoomed(true);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setZoom((z) => {
      const next = Math.min(Math.max(z + delta, 1), 4);
      if (next <= 1) { setPos({ x: 0, y: 0 }); setZoomed(false); }
      else setZoomed(true);
      return next;
    });
  };

  const handlePointerDown = (e) => {
    if (zoom <= 1) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    posStart.current = { ...pos };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPos({ x: posStart.current.x + dx, y: posStart.current.y + dy });
  };

  const handlePointerUp = () => setDragging(false);

  const handleKeyDown = (e) => {
    if (!fullscreen) return;
    if (e.key === "ArrowLeft") go(-1);
    else if (e.key === "ArrowRight") go(1);
    else if (e.key === "Escape") setFullscreen(false);
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (images.length === 0) return null;

  const allImages = images.map(resolveSrc);

  const galleryContent = (
    <div className="court-gallery">
      {/* Main image */}
      <div
        className="gallery-main"
        onDoubleClick={toggleZoom}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in" }}
      >
        <img
          ref={imgRef}
          src={allImages[active]}
          alt=""
          draggable={false}
          style={{
            transform: `scale(${zoom}) translate(${pos.x / zoom}px, ${pos.y / zoom}px)`,
            transition: dragging ? "none" : "transform 0.25s ease",
          }}
        />

        {images.length > 1 && (
          <>
            <button className="gallery-arrow left" onClick={() => go(-1)}><LeftOutlined /></button>
            <button className="gallery-arrow right" onClick={() => go(1)}><RightOutlined /></button>
          </>
        )}

        <div className="gallery-toolbar">
          <button onClick={toggleZoom} title={zoomed ? "Kecilkan" : "Perbesar"}>
            {zoomed ? <ZoomOutOutlined /> : <ZoomInOutlined />}
          </button>
          <span className="gallery-counter">{active + 1} / {images.length}</span>
          <button onClick={() => setFullscreen(true)} title="Fullscreen">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="gallery-thumbs">
          {allImages.map((src, i) => (
            <div
              key={i}
              className={`gallery-thumb ${i === active ? "active" : ""}`}
              onClick={() => { setActive(i); setZoom(1); setPos({ x: 0, y: 0 }); setZoomed(false); }}
            >
              <img src={src} alt="" />
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen modal */}
      {fullscreen && (
        <div className="gallery-fullscreen" onClick={() => setFullscreen(false)}>
          <button className="gallery-fs-close" onClick={() => setFullscreen(false)}><CloseOutlined /></button>
          <div className="gallery-fs-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={allImages[active]}
              alt=""
              style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: 8 }}
            />
            {images.length > 1 && (
              <>
                <button className="gallery-fs-arrow left" onClick={() => go(-1)}><LeftOutlined /></button>
                <button className="gallery-fs-arrow right" onClick={() => go(1)}><RightOutlined /></button>
              </>
            )}
            <div className="gallery-fs-counter">{active + 1} / {images.length}</div>
          </div>
        </div>
      )}
    </div>
  );

  return galleryContent;
};

export default CourtGallery;
