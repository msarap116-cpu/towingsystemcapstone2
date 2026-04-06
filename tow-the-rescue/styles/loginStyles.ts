import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#f4f7f9"
  },

  navbar: {
    backgroundColor: "#0d6efd",
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },

  brand: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold"
  },

  navLinks: {
    flexDirection: "row",
    gap: 15
  },

  navLink: {
    color: "rgba(255,255,255,0.8)"
  },

  mainContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },

  loginCard: {
    backgroundColor: "white",
    padding: 30,
    borderRadius: 8,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5
  },

  title: {
    textAlign: "center",
    fontSize: 20,
    marginBottom: 20,
    fontWeight: "600"
  },

  formGroup: {
    marginBottom: 15
  },

  label: {
    marginBottom: 5,
    fontWeight: "500"
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 10
  },

  formCheck: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20
  },

  loginBtn: {
    backgroundColor: "#0d6efd",
    padding: 12,
    borderRadius: 4,
    alignItems: "center"
  },

  loginText: {
    color: "white",
    fontSize: 16
  },

  footer: {
    marginTop: 20,
    alignItems: "center",
    gap: 8
  },

  link: {
    color: "#0d6efd"
  }

});