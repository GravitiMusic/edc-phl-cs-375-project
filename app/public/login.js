let usernameInput = document.getElementById("username");
let passwordInput = document.getElementById("password");

let loginButton = document.getElementById("submit")

loginButton.addEventListener("click", () => {
    let user = usernameInput.value;
    let pass = passwordInput.value;

    fetch("/login",  {
      method: "POST",
      headers: {
          "Content-Type": "application/json"
      },
      body: JSON.stringify(
      {
          username: user,
          password: pass
      })
    })
    .then(response => {
      console.log(response)
    }).catch(error => {
      console.log(error);
    })
})