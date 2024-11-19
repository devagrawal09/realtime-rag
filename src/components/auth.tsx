import { login, logout } from "~/lib/auth";

export function Login() {
  return (
    <form
      action={login}
      method="post"
      style={{
        "text-align": "center",
        "margin-top": "100px",
        "font-size": "20px",
      }}
    >
      <input
        type="text"
        name="userId"
        style={{
          "background-color": "#f2f2f2",
          border: "1px solid grey",
          "border-radius": "5px",
          color: "black",
          padding: "15px 32px",
          "text-align": "center",
          "text-decoration": "none",
          display: "inline-block",
          "font-size": "16px",
          margin: "4px 2px",
        }}
        placeholder="Username"
      />
      <button
        type="submit"
        style={{
          "background-color": "#4CAF50",
          border: "none",
          "border-radius": "5px",
          color: "white",
          padding: "15px 32px",
          "text-align": "center",
          "text-decoration": "none",
          display: "inline-block",
          "font-size": "16px",
          margin: "4px 2px",
          cursor: "pointer",
        }}
      >
        Login
      </button>
    </form>
  );
}

export function Logout() {
  return (
    <form
      action={logout}
      method="post"
      style={{
        "text-align": "center",
        "font-size": "20px",
        float: "right",
      }}
    >
      <button
        type="submit"
        style={{
          "background-color": "#f44336",
          "border-radius": "5px",
          color: "white",
          padding: "5px 10px",
          "text-align": "center",
          "text-decoration": "none",
          display: "inline-block",
          "font-size": "16px",
          margin: "4px 2px",
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </form>
  );
}
