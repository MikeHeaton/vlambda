;;; testing.lisp
;;; by Philip Fong
;;;
;;; Introductory comments are preceded by ";;;"
;;; Function headers are preceded by ";;"
;;; Inline comments are introduced by ";"
;;;

;;
;; Triple the value of a number
;;

(defun triple (X)
  "Compute three times X."  ; Inline comments can
  (* 3 X))                  ; be placed here.

;;
;; Negate the sign of a number
;;
