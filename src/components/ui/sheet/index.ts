// src/components/ui/sheet/index.ts - point d'entree de la sheet : la racine + les parties du dialog re-exportees sous leur nom Sheet*, sans duplication.
export { default as Sheet, sheet } from "./Sheet.astro";
export { default as SheetTrigger } from "../dialog/DialogTrigger.astro";
export { default as SheetClose } from "../dialog/DialogClose.astro";
export { default as SheetHeader } from "../dialog/DialogHeader.astro";
export { default as SheetTitle } from "../dialog/DialogTitle.astro";
export { default as SheetDescription } from "../dialog/DialogDescription.astro";
export { default as SheetFooter } from "../dialog/DialogFooter.astro";
