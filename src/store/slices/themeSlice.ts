import { createSlice } from "@reduxjs/toolkit";

type Theme = "light" | "dark";

interface ThemeState {
  value: Theme;
}

const initialState: ThemeState = {
  // Persist across reloads using localStorage (optional)
  value:
    typeof window !== "undefined" && localStorage.getItem("theme") === "dark"
      ? "dark"
      : "light",
};

export const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    toggleTheme(state) {
      state.value = state.value === "light" ? "dark" : "light";
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", state.value);
      }
    },
    setTheme(state, action: { payload: Theme }) {
      state.value = action.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", state.value);
      }
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;