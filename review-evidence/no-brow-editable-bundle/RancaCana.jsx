import React from "react";

// Editable SVG geometry. Only the body textures are raster images.
const DEFAULT_RANCA_BODY = "assets/ranca-body.webp";
const DEFAULT_CANA_BODY = "assets/cana-body.webp";

export function RancaArtwork({ bodySrc = DEFAULT_RANCA_BODY } = {}) {
  return (
    <g id="ranca-artwork">
      <image href={bodySrc} width="741" height="532" data-body-art="ranca" id="ranca-body" />
      <g transform="translate(-115 -249) scale(3)" data-face-map="ranca" id="ranca-face-placement">
        <g fill="#f6fff8" stroke="#f6fff8" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" data-expression="happy" data-preserved-face="ranca" id="ranca-face">
          <g transform="translate(147 157) rotate(-17)" id="ranca-left-eye-group">
            <path d="M -8 1 Q 2 -8 12 1" fill="none" data-line-eye="ranca" id="ranca-left-eye" />
          </g>
          <g transform="translate(182 143) rotate(-17)" id="ranca-right-eye-group">
            <path d="M -8 1 Q 2 -8 12 1" fill="none" data-line-eye="ranca" id="ranca-right-eye" />
          </g>
          <path d="M 158 173 Q 166 171 177 166 C 179 176 174 185 168 184 C 161 184 158 180 158 173 Z" stroke="none" id="ranca-mouth" />
        </g>
      </g>
      <g data-limb="active" transform="translate(83.6 -192.4) scale(2.6)" fill="none" stroke="#f6fff8" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" id="ranca-active-hand-group">
        <path data-arm="left" d="M 77 203 C 59 222 70.04866878936727 188.2973286272833 61.569831835594435 185.44964115999753" id="ranca-left-arm" />
        <path data-palm="left" d="M -4 11 C -8 9 -11 5 -14 0 C -18 -5 -17 -9 -14 -9 C -11 -9 -10 -5 -7 -3 C -8 -7 -9 -12 -9 -15 C -9 -20 -4 -21 -3 -16 C -2 -14 -1 -11 -1 -10 C -1 -12 -1 -16 -1 -18 C -1 -23 5 -23 5 -18 C 5 -16 5 -12 5 -10 C 5.7 -11.7 6.3 -13.3 7 -15 C 9 -20 14 -18 13 -13 C 12.3 -9 11.7 -5 11 -1 C 10 4 8 9 4 11" transform="translate(64 174) rotate(-8) scale(-1 1)" id="ranca-left-palm" />
      </g>
      <g data-limb="resting" transform="translate(30.2 -207.4) scale(2.6)" fill="none" stroke="#f6fff8" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" id="ranca-resting-hand-group">
        <path data-arm="right" d="M 207 197 L 207 235.53846153846152" id="ranca-right-arm" />
        <path data-palm="right" d="M -4 11 C -8 9 -11 4 -12 0 C -15 -4 -13 -8 -10 -7 C -7 -6 -7 -3 -5 -2 C -5 -5 -6 -8 -5 -10 C -3 -13 0 -12 0 -9 C 0 -7 0 -5 0 -4 C 1 -6 2 -8 3 -9 C 5 -11 8 -9 7 -6 C 6 -4 6 -3 5 -2 C 7 -4 9 -5 11 -3 C 13 -1 11 3 9 5 C 8 7 7 9 6 10 C 5 10.5 4.5 10.8 4 11" transform="translate(203 246.53846153846152) rotate(180) scale(-1 1)" id="ranca-right-palm" />
      </g>
    </g>
  );
}

export function CanaArtwork({ bodySrc = DEFAULT_CANA_BODY } = {}) {
  return (
    <g id="cana-artwork">
      <image href={bodySrc} width="745" height="528" data-body-art="cana" id="cana-body" />
      <g transform="translate(29.6 -293.4) scale(3.2)" data-face-map="cana" id="cana-face-placement">
        <g fill="#fff9fc" stroke="#fff9fc" strokeWidth="3.7" strokeLinecap="round" strokeLinejoin="round" data-expression="happy" data-preserved-face="cana" id="cana-face">
          <g transform="translate(72 167) rotate(8)" id="cana-left-eye-group">
            <path d="M 12 -3 Q 2.08696 -3.75 -7 -6" fill="none" data-line-eye="cana" id="cana-left-eye" />
            <path d="M 6.80429 -2.8885 C 4.77211 -3.77869 2.47819 -6.05524 3.16087 -8.925 C 3.01746 -6.24476 5.51485 -4.77131 7.38592 -4.049 Z M -3.59785 -4.56989 C -5.8455 -5.44454 -9.88109 -7.35044 -9.8913 -11.625 C -9.40587 -7.64956 -5.3458 -6.55546 -3.0665 -5.75011 Z" fill="#fff9fc" stroke="none" strokeWidth="1.4" data-lashes="cana" id="cana-left-lashes" />
          </g>
          <g transform="translate(117 166) rotate(-12)" id="cana-right-eye-group">
            <path d="M -11 -3 Q 1 -4 12 -7" fill="none" data-line-eye="cana" id="cana-right-eye" />
            <path d="M -4.71046 -2.85133 C -2.25045 -4.03825 0.5264 -7.07365 -0.3 -10.9 C -0.1264 -7.32635 -3.14955 -5.36175 -5.41454 -4.39867 Z M 7.88161 -5.09319 C 10.60245 -6.25938 15.48763 -8.80058 15.5 -14.5 C 14.91237 -9.19942 9.99755 -7.74062 7.23839 -6.66681 Z" fill="#fff9fc" stroke="none" strokeWidth="1.4" data-lashes="cana" id="cana-right-lashes" />
          </g>
          <path d="M 86 186 Q 98 194 112 181" fill="none" id="cana-mouth" />
        </g>
      </g>
      <g data-limb="active" transform="translate(70.6 -220.8) scale(2.6)" fill="none" stroke="#fff9fc" strokeWidth="3.7" strokeLinecap="round" strokeLinejoin="round" id="cana-active-hand-group">
        <path data-arm="left" d="M 57 209 C 23 225 39.036603307201176 197.68443485892084 30.77706501014608 194.2522304478346" id="cana-left-arm" />
        <path data-palm="left" d="M -4 11 C -8 9 -11 5 -14 0 C -18 -4.65 -17 -8.370000000000001 -14 -8.370000000000001 C -11 -8.370000000000001 -10 -4.65 -7 -2.79 C -8 -6.510000000000001 -9 -11.16 -9 -13.950000000000001 C -9 -18.6 -4 -19.53 -3 -14.88 C -2 -13.020000000000001 -1 -10.23 -1 -9.3 C -1 -11.16 -1 -14.88 -1 -16.740000000000002 C -1 -21.39 5 -21.39 5 -16.740000000000002 C 5 -14.88 5 -11.16 5 -9.3 C 5.7 -10.881 6.3 -12.369000000000002 7 -13.950000000000001 C 9 -18.6 14 -16.740000000000002 13 -12.09 C 12.3 -8.370000000000001 11.7 -4.65 11 -0.93 C 10 4 8 9 4 11" transform="translate(34 183) rotate(-4) scale(-1 1)" id="cana-left-palm" />
      </g>
      <g data-limb="resting" transform="translate(87.2 -207.4) scale(2.6)" fill="none" stroke="#fff9fc" strokeWidth="3.7" strokeLinecap="round" strokeLinejoin="round" id="cana-resting-hand-group">
        <path data-arm="right" d="M 175 194 C 203 206 178.9748340336336 212.25224708266003 180.02910105771258 212.47252200619798" id="cana-right-arm" />
        <path data-palm="right" d="M -4 11 C -8 9 -11 4 -12 0 C -15 -3.72 -13 -7.44 -10 -6.510000000000001 C -7 -5.58 -7 -2.79 -5 -1.86 C -5 -4.65 -6 -7.44 -5 -9.3 C -3 -12.09 0 -11.16 0 -8.370000000000001 C 0 -6.510000000000001 0 -4.65 0 -3.72 C 1 -5.58 2 -7.44 3 -8.370000000000001 C 5 -10.23 8 -8.370000000000001 7 -5.58 C 6 -3.72 6 -2.79 5 -1.86 C 7 -3.72 9 -4.65 11 -2.79 C 13 -0.93 11 3 9 5 C 8 7 7 9 6 10 C 5 10.5 4.5 10.8 4 11" transform="translate(178 224) rotate(170) scale(-1 1)" id="cana-right-palm" />
      </g>
    </g>
  );
}

export default function RancaCana({ rancaBodySrc = DEFAULT_RANCA_BODY, canaBodySrc = DEFAULT_CANA_BODY, background = "#24493b" } = {}) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 715" role="img" aria-label="Ranca and Cana without eyebrows" style={{ display: "block", width: "100%", height: "auto" }}>
      <rect id="review-background" width="1600" height="715" fill={background} />
      <g id="ranca-placement" data-character="ranca" data-body-scale="1" transform="translate(20 100) scale(1)">
        <RancaArtwork bodySrc={rancaBodySrc} />
      </g>
      <g id="cana-placement" data-character="cana" data-body-scale="0.907258064516129" transform="translate(860 151.48387096774195) scale(0.907258064516129)">
        <CanaArtwork bodySrc={canaBodySrc} />
      </g>
      <text x="434" y="676" fontFamily="system-ui, sans-serif" fontSize="32" fill="#f1f7ee" textAnchor="middle">Ranca · playful</text>
      <text x="1191" y="676" fontFamily="system-ui, sans-serif" fontSize="32" fill="#f1f7ee" textAnchor="middle">Cana · sassy</text>
    </svg>
  );
}
