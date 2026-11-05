import { ImageResponse } from 'next/og';

export const alt = 'Mercury: sports events around Mumbai';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div style={{
      width: '100%', height: '100%', display: 'flex', position: 'relative',
      flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden',
      padding: '58px 68px', background: '#3156F5', color: '#FFFFFF',
      fontFamily: 'Arial, sans-serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', fontSize: 35, fontWeight: 800, letterSpacing: -2 }}>mercury</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 4, color: '#D9FF38', marginBottom: 20 }}>MUMBAI, IN PLAY</div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 78, lineHeight: 1.05, fontWeight: 800, letterSpacing: -4, maxWidth: 940 }}><span>Less scrolling.</span><span>More playing.</span></div>
        <div style={{ fontSize: 26, marginTop: 26 }}>Find tournaments, leagues and games around Mumbai.</div>
      </div>
      <div style={{ display: 'flex', fontSize: 19, fontWeight: 700, letterSpacing: 2 }}>BADMINTON&nbsp;&nbsp; · &nbsp;&nbsp;TENNIS&nbsp;&nbsp; · &nbsp;&nbsp;PICKLEBALL</div>
      <div style={{ position: 'absolute', width: 360, height: 360, right: -65, top: 100, borderRadius: 180, border: '48px solid #D9FF38', opacity: 0.28 }} />
    </div>,
    size,
  );
}
