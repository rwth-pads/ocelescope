\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{padsthesis}[2024/12/19 v0.2 PADS Thesis class]

\newcommand*{\pads@thesis@type}{Thesis Proposal}
\DeclareOption{master}{\renewcommand*{\pads@thesis@type}{Master Thesis}}
\DeclareOption{bachelor}{\renewcommand*{\pads@thesis@type}{Bachelor Thesis}}

% Pass remaining options to scrbook class and load that class
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{scrbook}}
\ProcessOptions\relax
\LoadClass[a4paper, titlepage=firstiscover, BCOR=10mm, numbers=noendperiod]{scrbook}

\RequirePackage{lmodern}

\RequirePackage{geometry}
\RequirePackage{rotate}

\RequirePackage{setspace}
\RequirePackage{hyphenat}

\RequirePackage[USenglish]{babel}

\RequirePackage{graphicx}
\RequirePackage{tikz}
\RequirePackage{subcaption}

\newcommand*{\pads@institute}{Chair of Process and Data Science}
\newcommand*{\pads@institution}{RWTH Aachen University}

\newcounter{m@trnr}
\setcounter{m@trnr}{0}
\newcommand*{\studentID}[1]{\setcounter{m@trnr}{#1}}
\newcommand*{\pads@first@examiner}{Prof.\ Dr.\ Wil M.\,P. van der Aalst}
\newcommand*{\pads@second@examiner}{Prof.\ Dr.\ Wil M.\,P. van der Aalst}
\newcommand*{\pads@advisor}{Dr.\ A. Advisor}
\newcommand*{\firstexaminer}[1]{\renewcommand*{\pads@first@examiner}{#1}}
\newcommand*{\secondexaminer}[1]{\renewcommand*{\pads@second@examiner}{#1}}
\newcommand*{\advisor}[1]{\renewcommand*{\pads@advisor}{#1}}

\newcommand{\pads@titlepage}{
	\newgeometry{top=32mm, left=10mm, right=10mm, bottom=16mm}
	\begin{titlepage}
		\setlength{\parindent}{0pt}

		\begin{tikzpicture}[remember picture, overlay, shift={(current page.north east)}, inner sep=0]
			\node[anchor=north east, xshift=-5mm]{
				\includegraphics[width=140mm, height=32mm, keepaspectratio]{figures/logo/rwth_pads_bild_rgb}
			};
		\end{tikzpicture}

		\sffamily
		The present work was submitted to:

		{\Large
		\textbf{\pads@institute}

		\textbf{\pads@institution}
		\par
		}

		\vspace*{32mm}

		\centering

		\hrule

		\vspace*{5mm}

		{\Huge\textbf{\@title}\par}

		\vspace*{5mm}

		\hrule

		\vspace*{32mm}

		{\Large\textbf{\pads@thesis@type}\par}

		\vspace*{8mm}

		presented by

			{\Large\textbf{\@author}\ifnum\them@trnr>0\relax

					\textbf{\them@trnr}\fi\par}

		\vfill
		\begin{tabular}{rl}
			First Examiner:  & \pads@first@examiner  \\
			Second Examiner: & \pads@second@examiner \\
			                 &                       \\
			Advisors:        & \pads@advisor
		\end{tabular}
		\vfill
		\centering{\Large Aachen, \@date\par}
	\end{titlepage}
	\restoregeometry
}
\renewcommand{\maketitle}{\pads@titlepage}

\endinput
