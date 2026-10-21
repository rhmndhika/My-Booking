const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { queryOne, run } = require("./db");
const { formatUser } = require("../utils/serialize");

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const avatar = profile.photos?.[0]?.value ?? null;
          let user = await queryOne("SELECT * FROM users WHERE googleId = ?", [profile.id]);

          if (!user) {
            const email = profile.emails[0].value.toLowerCase();
            // Cek apakah email sudah terdaftar lewat register manual
            user = await queryOne("SELECT * FROM users WHERE email = ?", [email]);
            if (user) {
              await run(
                "UPDATE users SET googleId = ?, avatar = COALESCE(NULLIF(avatar, ''), ?), updatedAt = NOW() WHERE id = ?",
                [profile.id, avatar, user.id]
              );
              user = await queryOne("SELECT * FROM users WHERE id = ?", [user.id]);
            } else {
              const result = await run(
                "INSERT INTO users (name, email, googleId, avatar, isVerified) VALUES (?, ?, ?, ?, 1)",
                [profile.displayName, email, profile.id, avatar]
              );
              user = await queryOne("SELECT * FROM users WHERE id = ?", [result.insertId]);
            }
          }
          return done(null, formatUser(user));
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn("GOOGLE_CLIENT_ID/SECRET belum diisi, login Google dinonaktifkan");
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await queryOne("SELECT * FROM users WHERE id = ?", [id]);
    done(null, formatUser(user));
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
