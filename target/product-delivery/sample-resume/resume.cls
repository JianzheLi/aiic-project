\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{resume}[2026/05/10 Lightweight PKU-style resume for AIIC demo]
\LoadClass[UTF8,10.5pt]{ctexart}

\RequirePackage{fontspec}
\RequirePackage{graphicx}
\RequirePackage{enumitem}
\RequirePackage{titlesec}
\RequirePackage{xcolor}
\RequirePackage{geometry}
\RequirePackage{xifthen}
\RequirePackage{hyperref}

\definecolor{pkured}{RGB}{139,0,18}
\definecolor{textgray}{RGB}{55,55,55}

\setmainfont{TeX Gyre Termes}
\setCJKmainfont{Noto Serif CJK SC}
\setCJKsansfont{Noto Sans CJK SC}

\geometry{a4paper,left=1.25cm,right=1.25cm,top=1.05cm,bottom=1.05cm,nohead,nofoot}
\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0pt}
\setlist[itemize]{topsep=0.15em,leftmargin=1.35em,itemsep=0.08em,parsep=0pt}
\hypersetup{colorlinks=true,linkcolor=pkured,urlcolor=pkured}

\titleformat{\section}
  {\large\bfseries\color{pkured}}
  {}{0em}{}
  [\vspace{-0.65em}\textcolor{pkured}{\rule{\textwidth}{0.7pt}}]
\titlespacing*{\section}{0cm}{0.62em}{0.24em}
\titleformat{\subsection}{\normalsize\bfseries\color{textgray}}{}{0em}{}
\titlespacing*{\subsection}{0pt}{0.18em}{0.04em}

\newcommand{\resumeheader}[4]{%
  \noindent
  \begin{minipage}[c]{0.18\textwidth}
    \includegraphics[width=\textwidth]{#1}
  \end{minipage}%
  \hfill
  \begin{minipage}[c]{0.76\textwidth}
    \centering
    {\Large\bfseries #2}\\[0.3em]
    {\small #3}
  \end{minipage}%
  \vspace{0.35em}
}

\newcommand{\datedsubsection}[2]{%
  \subsection[#1]{#1 \hfill {\normalfont #2}}%
}

\newcommand{\projecttitle}[2]{%
  \par\vspace{0.18em}\noindent\textbf{#1}\\
  {\small #2}\par\vspace{0.05em}
}
