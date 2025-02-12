const router = require("express").Router();
const { User, Recipe, Category } = require("../../models");
const withAuth = require("../../utils/auth");

// CREATE new user
router.post("/", (req, res) => {
  User.create({
    name: req.body.name,
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
  })
    .then((dbUserData) => {
      // Set up sessions with a 'logged_in' variable set to `true`
      req.session.logged_in = true;
      req.session.user_id = dbUserData.id;
      res.status(200).json(dbUserData);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

/// Your route to fetch user-specific recipes
router.get("/api/recipes/user", withAuth, async (req, res) => {
  try {
    // Find the logged-in user based on the session ID
    const user = await User.findByPk(req.session.user_id, {
      include: [
        {
          model: Recipe,
          attributes: [
            "id",
            "recipe_name",
            "cook_time",
            "recipe_text",
            "picture",
          ],
          include: [
            {
              model: Category, // Include the Category model to get category details
              attributes: ["category_name"], // Include only the 'category_name' property from Category
            },
          ],
        },
      ],
    });

    // If the user doesn't exist or has no recipes, send an empty array as the response
    if (!user || !user.Recipes) {
      return res.status(200).json([]);
    }

    // Extract the user-specific recipes with category details
    const userRecipes = user.Recipes.map((recipe) => {
      return {
        id: recipe.id,
        recipe_name: recipe.recipe_name,
        cook_time: recipe.cook_time,
        recipe_text: recipe.recipe_text,
        picture: recipe.picture,
        category_name: recipe.Category
          ? recipe.Category.category_name
          : "Uncategorized", // Get the category name if available, otherwise set it to "Uncategorized"
      };
    });

    // Send the user-specific recipes as the response
    res.status(200).json(userRecipes);
  } catch (err) {
    console.error("Error fetching user recipes:", err);
    res.status(500).json({ message: "Failed to fetch user recipes" });
  }
});
// Login
router.post("/login", (req, res) => {
  User.findOne({
    where: {
      email: req.body.email,
    },
  })
    .then((dbUserData) => {
      if (!dbUserData) {
        res
          .status(400)
          .json({ message: "Incorrect email or password. Please try again!" });
        return;
      }

      dbUserData
        .checkPassword(req.body.password)
        .then((validPassword) => {
          if (!validPassword) {
            res.status(400).json({
              message: "Incorrect email or password. Please try again!",
            });
            return;
          }

          // Once the user successfully logs in, set up the sessions variable 'logged_in'
          req.session.logged_in = true;
          req.session.user_id = dbUserData.id;
          res
            .status(200)
            .json({ user: dbUserData, message: "You are now logged in!" });
        })
        .catch((err) => {
          console.log(err);
          res.status(500).json(err);
        });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

// Logout
router.post("/logout", (req, res) => {
  // When the user logs out, destroy the session
  if (req.session.logged_in) {
    req.session.destroy(() => {
      res.status(204).end();
    });
  } else {
    res.status(404).end();
  }
});

module.exports = router;
