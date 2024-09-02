\NeedsTeXFormat{LaTeX2e}

\LoadClassWithOptions{report}
\ProvidesClass{WCarticle}


%%% configure character set and set character encoding to use utf-8 
\RequirePackage[utf8]{inputenc}
\RequirePackage[T1]{fontenc}

%%% use a non-rasterized font and enable accurate color specification 
\RequirePackage[table]{xcolor}
\RequirePackage{lmodern}

%%% page layout
\RequirePackage[]{geometry}

\geometry{
	a4paper,
	total = {210mm, 297mm},
	left = 35mm,
	right = 25mm,
	top = 34mm,
	bottom = 34mm
}

%%% FancyHDR setup
\usepackage{fancyhdr} 
\fancyhead[LO,RE]{}
\fancyhead[LE,RO]{\nouppercase{\leftmark}}
%\setlength{\headheight}{14pt}
%%% TiKZ setup
\RequirePackage{tikz}
\usetikzlibrary{calc, shapes, arrows, positioning, patterns, backgrounds, petri, automata, quotes}

%$% amstheorem setup (order of the require's matters here!)
%$ introduce separate theorem-like environments 
%using a shared counter tied to the section numbering
\RequirePackage{textcomp}
\RequirePackage[hyphens]{url}
\RequirePackage[hidelinks]{hyperref}
\RequirePackage{amsmath, amsthm, amssymb,mathrsfs, array}
\RequirePackage[capitalize]{cleveref}

%% allow more lines into one lines
\RequirePackage{makecell}
\renewcommand\theadalign{bc}
\renewcommand\theadfont{\bfseries}
\RequirePackage[ruled,linesnumbered]{algorithm2e}
\RequirePackage{wrapfig}
%\RequirePackage{svg}
%\RequirePackage{subcaption}
\RequirePackage[parfill]{parskip}

%%make the chapters separate from each other
%\RequirePackage{graphicx}
%\graphicspath{{figures/}{../figures/}}
%\RequirePackage{subfiles}

%% Customize theorem / definition environments (add margins)
\newtheoremstyle{mydefinition}% 〈name〉
{3pt}% 〈Space above〉
{3pt}% 〈Space below〉
{}% 〈Body font〉
{\parindent}% 〈Indent amount〉
% (Indent amount: empty = no indent, \parindent = normal paragraph indent)
{\bfseries}% 〈Theorem head font〉
{:}% 〈Punctuation after theorem head〉
{.5em}% 〈Space after theorem head〉
% (Space after theorem head: { } = normal interword space; \newline = linebreak)
{}% 〈Theorem head spec (can be left empty, meaning ‘normal’)

\theoremstyle{mydefinition} % change the\underline{\underline{}} font type for theorem-like environments to not use italics (default).

\newtheorem{theorem}{Theorem}[chapter]
\newtheorem{proposition}[theorem]{Proposition}
\newcommand{\propositionautorefname}{Proposition}
\newtheorem{example}[theorem]{Example}
\newcommand{\exampleautorefname}{Example}
\newtheorem{definition}[theorem]{Definition}
\newcommand{\definitionautorefname}{Definition}
\newtheorem{remark}[theorem]{Remark}
\newcommand{\remarkautorefname}{Remark}
\newtheorem{observation}[theorem]{Observation}
\newcommand{\observationautorefname}{Observation}
\newtheorem{convention}[theorem]{Convention}
\newcommand{\conventionautorefname}{Convention}
\newtheorem{lemma}[theorem]{Lemma}
\newcommand{\lemmaautorefname}{Lemma}
\newtheorem{corollary}[theorem]{Corollary}
\newcommand{\corollaryautorefname}{Corollary}
\newtheorem{notation}[theorem]{Notation}
\newcommand{\notationautorefname}{Notation}


%%% Miscellaneous
\RequirePackage{framed}
\RequirePackage{enumerate}
\RequirePackage{subcaption}
\RequirePackage{pgfplots}
\pgfplotsset{compat=1.15} 
%%% BibTeX setup

\RequirePackage[numbers,sort&compress]{natbib}
\RequirePackage{notoccite}
\bibliographystyle{unsrtnatmasterthesis}
% \bibliographystyle{unsrtnat}

%% Set the enumearete item
\RequirePackage[shortlabels]{enumitem}
%\setlist{nosep, itemsep=0pt, parsep=0pt, before={\parskip=0pt}, after=\vspace{-\docparskip}}%
%% set the section numbering depth
\setcounter{secnumdepth}{6}
%% to print out wide table
%\RequirePackage{lscape}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%% user-defined macros
\newcommand{\gHeader}{Bachelor thesis}
\newcommand{\gTitle}{Fancy long name for something incredibly useless}
\newcommand{\gAuthor}{Author Name}
\newcommand{\gStudentID}{Student ID}
\newcommand{\gSupervisor}{Supervisor}
\newcommand{\gExaminer}{Examiners}
\newcommand{\gInstitution}{RWTH Aachen}
\newcommand{\gRegDate}{YYYY-MM-DD}
\newcommand{\gSubDate}{YYYY-MM-DD}

\newcommand{\gTitlePage}{ 
						\begin{titlepage}
							\sffamily
						    \begin{tikzpicture}[remember picture,overlay]
                            \node[anchor=north east,inner sep=0pt] at (17.5,3.5) {\includegraphics[scale=.22]{figures/logo/pads_logo_text.jpg}};
                            \end{tikzpicture}
                        
							 \centering
						
							% \vspace{1.5cm}
							This work was submitted to: \\
							 \vspace{0.4cm}
							\textbf{{\gInstitution}} \par
							\vspace{2cm}
						
						
						%	\vspace{3cm}
							
							\hrule
							\ \\ \ \\
							
							{
								\huge
								\textbf{\gTitle}
							}
							
							\ \\ \ \\
							\hrule
							
							\vspace{2cm}
							 
							\textbf{\LARGE{\gHeader}}
						
							\vspace{1.5cm}
							
							\begin{tabular}{@{}>{\itshape}rl@{}}
								\emph{Author:} & 	\textbf{\Large{\gAuthor}} \\
								\rule{0pt}{5ex}
								
								\emph{Student ID:} & 	\textbf{\Large{\gStudentID}} \\
								\rule{0pt}{15ex}
								
								\emph{Supervisor:} & 
								\makecell[l]{ \gSupervisor} \\
								
								\rule{0pt}{8ex} 
								\emph{Examiners:} & 
								\makecell[l]{ \gExaminer} \\
								
								\rule{0pt}{15ex} 
								\emph{Registration Date:}  & \gRegDate \\
								\rule{0pt}{4ex}  
								\emph{Submission Date:}    & \gSubDate
							
							\end{tabular}
						
						%% ZPA wants this info at the top of the page! 21.04.2022. Seran Uysal.
						%%	\vspace{1.5cm}
						%%	This work was submitted to the institute: \\
						%%	\vspace{0.5cm}
						%%	\textbf{{\gInstitution}} \par
						%%	\vspace{2cm}
							
						\end{titlepage}
					}

%% general mathematics
\DeclareMathOperator*{\argmin}{arg\,min}
\DeclareMathOperator*{\argmax}{arg\,max}
% \DeclareMathOperator*{\Aut}{Aut}


%% probability theory
% \newcommand{\ev}[1]{\mathbb{E} \left[ #1 \right]}
% \newcommand{\pr}[1]{\operatorname{Pr} \left[ #1 \right]}

%% complexity theory
% \newcommand{\cc}[1]{\mathsf{#1}} 		% Complexity classes in sans-serif
% \newcommand{\prob}[1]{\textsc{#1}}		% Classical problems in smallcaps
% \newcommand{\pprob}[1]{\textsc{$p$-#1}}	% Parameterized problems with a prefaced $p-$


%% graph theory

% \newcommand{\ecc}{\operatorname{ecc}}
% \newcommand{\dist}{\operatorname{dist}}
% \newcommand{\ad}{\operatorname{ad}}

%%% shortcuts
% \newcommand{\GI}{\prob{GI}}
% \renewcommand{\P}{\cc{P}}
% \newcommand{\NP}{\cc{NP}}
% \renewcommand{\L}{\cc{L}}

%%% E X P E R I M E N T A L

% \RequirePackage{forloop}% http://ctan.org/pkg/forloop
% \newcounter{loopcntr}
% \newcommand{\rpt}[2][1]{%
%   \forloop{loopcntr}{0}{\value{loopcntr}<#1}{#2}%
% }

% \newcommand{\alignment}[3]{
% \begin{tabular}{*{#1}{|c}|}
%     #2\\
%     \hline
%      & #3\\
% \end{tabular}
% }

% \newcommand{\extraalignment}[4]{
% \begin{tabular}{*{#1}{|c}|}
%     #2\\
%     \hline
%     #3\\
%     #4\\
% \end{tabular}
% }

% \newcommand{\doublegg}{\multirow{2}{*}{$\gg$}}

% \newcommand{\bigalignment}[5]{
% \begin{tabular}{*{#1}{|c}|}
%     #2\\
%     #3\\
%     \hline
%     #4\\
%     #5\\
% \end{tabular}
% }

% \newcommand{\Univ}[1]{\mathbb{U}_#1}
% \newcommand{\Log}{\mathcal{L}}
% \newcommand{\C}{\mathcal{C}}
% \newcommand{\E}{\mathcal{E}}
% \newcommand{\I}{\mathcal{I}}

% \newcommand{\tstart}{\rhd}
% \newcommand{\tend}{\square}
% \newcommand{\missup}{+}
% \newcommand{\missdown}{-}

% \newcommand{\set}[2]{\{#1|#2\}}
% \newcommand{\pre}[1]{{^{\bullet}#1}}
% \newcommand{\post}[1]{#1^{\bullet}}
% \renewcommand{\restriction}{\mathord{\upharpoonright}}

% \newcommand{\XOR}{\ \mathit{XOR}\ }
% \newcommand{\var}[1]{\mathit{#1}}
% \newcommand{\func}[1]{\mathit{#1}}

% \newcommand{\CIS}{\var{CIS}}
% \newcommand{\IIS}{\var{IIS}}
% \newcommand{\IS}{\var{IS}}

\RequirePackage{listings}
% \RequirePackage[noend]{algpseudocode}
\RequirePackage{multirow}
%\setlength{\parindent}{0pt} % removes paragraph indentation