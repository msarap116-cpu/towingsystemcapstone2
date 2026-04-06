import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#f4f6f9"
  },

  navbar: {
    backgroundColor: "#0d6efd",
    padding: 15
  },

  brand: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold"
  },

  centerContainer: {
    flex: 1,
    alignItems: "center",
    marginTop: 30
  },

  formContainer: {
    width: "90%",
    maxWidth: 600,
    backgroundColor: "white",
    padding: 25,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5
  },

  title: {
    textAlign: "center",
    fontSize: 22,
    marginBottom: 20,
    fontWeight: "600"
  },

  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 15
  },

  formGroup: {
    flex: 1
  },

  label: {
    marginBottom: 5,
    fontWeight: "500"
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10
  },

  checkboxGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20
  },

  checkboxText: {
    flex: 1,
    fontSize: 14
  },

  button: {
    backgroundColor: "#0d6efd",
    padding: 12,
    borderRadius: 6,
    alignItems: "center"
  },

  buttonText: {
    color: "white",
    fontSize: 16
  },

  footer: {
    marginTop: 15,
    alignItems: "center"
  },

  link: {
    color: "#0d6efd"
  }

});