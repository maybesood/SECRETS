//jshint esversion:6
require('dotenv').config();
const express=require("express");
const bodyParser=require("body-parser");
const ejs=require("ejs");
const mongoose=require("mongoose");
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate=require("mongoose-findorcreate");



const app=express();



app.set('view engine','ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({
    extended:true
}));

//configure and enable session management
app.use(session({
    secret:"our little secret",
    resave:false,
    saveUninitialized:false
}));


//setting and configuring passport.js
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://127.0.0.1:27017/userDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

//enable usage of createIndex();
mongoose.set("useCreateIndex",true);

const userSchema= new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    secret:String

});

userSchema.plugin(passportLocalMongoose); //simplifies the implementation of username/password
userSchema.plugin(findOrCreate);// It simplifies the process of searching for a user in the database and creating a new user if one does not exist.

const User=new mongoose.model("User",userSchema);

passport.use(User.createStrategy());  //to configure and set up the authentication strategy for local username and password authentication


//used to store and retrieve user information in a session
passport.serializeUser(function(user,done){
  done(null,user.id);
})
passport.deserializeUser(function(id,done){
  User.findById(id,function(err,user){
    done(err,user);
  });
});

// configure the Google Strategy for authentication using Passport.js 
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res){
    res.render("home");
});

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  }
);

app.get("/auth/google", function(req, res) {
  passport.authenticate("google", { scope: ["profile"] })(req, res);
});


app.get("/login",function(req,res){
    res.render("login");
});

app.get("/register",function(req,res){
    res.render("register");
});

app.get("/secrets",function(req,res){
    User.find({"secret":{$ne:null}},function(err,foundUsers){
      if(err){
        console.log(err);
      }else{
        if (foundUsers){
          res.render("secrets",{usersWithSecrets:foundUsers});
        }
      }
    });

});

app.get("/submit", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit",function(req,res){
  const submittedSecret=req.body.secret;

  // console.log(req.user.id);
  // first find the user by id and then save his secret and then redirect to secrets
  User.findById(req.user.id,function(err,foundUser){
    if(err){
      console.log(err);
    }
    else{
      if (foundUser){
        foundUser.secret=submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        })
      }
    }
  })
})


app.get("/logout", function(req, res) {
  req.logout(function(err) {
      if (err) {
          console.log(err);
      }
      res.redirect("/");
  });
});

  

app.post("/register", async function(req, res) {
    User.register(
      { username: req.body.username },  //parameter 1
      req.body.password,   //parameter2
      function(err, user) {   //parameter3     parameters are username,pwd and callback function
        if (err) {
          console.log(err);
          res.redirect("/register");
        } else {
          passport.authenticate("local")(req, res, function() {
            res.redirect("/secrets");
          });
        }
      }
    );
  });
  

app.post("/login", async function(req, res) {
    const user=new User({
        username:req.body.username,
        password:req.body.password
    });

    req.login(user, function(err){
        if (err){
            console.log(err);
        } else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }
    });
  });
//to start the port write this code
app.listen(3000,function(){
    console.log("Server started on port 3000");
});



// //jshint esversion:6
// require('dotenv').config();
// const express = require("express");
// const bodyParser = require("body-parser");
// const ejs = require("ejs");
// const mongoose = require("mongoose");
// const session = require("express-session");
// const passport = require("passport");
// const passportLocalMongoose = require("passport-local-mongoose");

// const app = express();

// app.set('view engine', 'ejs');
// app.use(express.static("public"));
// app.use(bodyParser.urlencoded({
//     extended: true
// }));

// //configure and enable session management
// app.use(session({
//     secret: "our little secret",
//     resave: false,
//     saveUninitialized: false
// }));

// //setting and configuring passport.js
// app.use(passport.initialize());
// app.use(passport.session());

// mongoose.connect('mongodb://127.0.0.1:27017/userDB', {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
// });

// //enable usage of createIndex();
// mongoose.set("useCreateIndex", true);

// const userSchema = new mongoose.Schema({
//     email: String,
//     password: String,
//     secret: String
// });

// userSchema.plugin(passportLocalMongoose);

// const User = new mongoose.model("User", userSchema);

// passport.use(User.createStrategy());

// passport.serializeUser(function (user, done) {
//     done(null, user.id);
// });

// passport.deserializeUser(function (id, done) {
//     User.findById(id, function (err, user) {
//         done(err, user);
//     });
// });

// app.get("/", function (req, res) {
//     res.render("home");
// });

// app.get("/login", function (req, res) {
//     res.render("login");
// });

// app.get("/register", function (req, res) {
//     res.render("register");
// });

// app.get("/secrets", function (req, res) {
//     User.find({ "secret": { $ne: null } }, function (err, foundUsers) {
//         if (err) {
//             console.log(err);
//         } else {
//             if (foundUsers) {
//                 res.render("secrets", { usersWithSecrets: foundUsers });
//             }
//         }
//     });
// });

// app.get("/submit", function (req, res) {
//     if (req.isAuthenticated()) {
//         res.render("submit");
//     } else {
//         res.redirect("/login");
//     }
// });

// app.post("/submit", function (req, res) {
//     const submittedSecret = req.body.secret;

//     User.findById(req.user.id, function (err, foundUser) {
//         if (err) {
//             console.log(err);
//         }
//         else {
//             if (foundUser) {
//                 foundUser.secret = submittedSecret;
//                 foundUser.save(function () {
//                     res.redirect("/secrets");
//                 });
//             }
//         }
//     });
// });

// app.get("/logout", function (req, res) {
//     req.logout(function (err) {
//         if (err) {
//             console.log(err);
//         }
//         res.redirect("/");
//     });
// });

// app.post("/register", async function (req, res) {
//     User.register(
//         { username: req.body.username },
//         req.body.password,
//         function (err, user) {
//             if (err) {
//                 console.log(err);
//                 res.redirect("/register");
//             } else {
//                 passport.authenticate("local")(req, res, function () {
//                     res.redirect("/secrets");
//                 });
//             }
//         }
//     );
// });

// app.post("/login", async function (req, res) {
//     const user = new User({
//         username: req.body.username,
//         password: req.body.password
//     });

//     req.login(user, function (err) {
//         if (err) {
//             console.log(err);
//        } else {
//             passport.authenticate("local")(req, res, function () {
//                 res.redirect("/secrets");
//             });
//         }
//     });
// });

// app.listen(3000, function () {
//     console.log("Server started on port 3000");
// });
