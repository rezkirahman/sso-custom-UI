"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PinInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  mask?: boolean;
}

export function PinInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  hasError = false,
  mask = true,
}: PinInputProps) {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Array of single digit values
  const digits = React.useMemo(() => {
    const arr = value.split("");
    while (arr.length < length) {
      arr.push("");
    }
    return arr.slice(0, length);
  }, [value, length]);

  const handleInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const digit = val.replace(/\D/g, "").slice(-1); // ambil digit terakhir jika ada

    const newDigits = [...digits];
    newDigits[index] = digit;
    const combined = newDigits.join("");
    onChange(combined);

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (combined.length === length && !combined.includes("")) {
      onComplete?.(combined);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        onChange(newDigits.join(""));
      } else {
        const newDigits = [...digits];
        newDigits[index] = "";
        onChange(newDigits.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pastedData) return;

    onChange(pastedData);
    const targetIdx = Math.min(pastedData.length, length - 1);
    inputRefs.current[targetIdx]?.focus();

    if (pastedData.length === length) {
      onComplete?.(pastedData);
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3 w-full max-w-sm mx-auto">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type={mask ? "password" : "text"}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleInputChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          aria-label={`Digit PIN ${index + 1}`}
          className={cn(
            "h-12 w-11 sm:h-14 sm:w-12 text-center text-xl sm:text-2xl font-bold font-mono tracking-widest",
            "rounded-xl border bg-background text-foreground transition-all outline-none",
            "focus:border-primary focus:ring-2 focus:ring-primary/30",
            hasError
              ? "border-destructive text-destructive focus:border-destructive focus:ring-destructive/30"
              : digit
              ? "border-primary/60 bg-primary/5"
              : "border-input hover:border-muted-foreground/50",
            disabled && "cursor-not-allowed opacity-50 bg-muted"
          )}
        />
      ))}
    </div>
  );
}
