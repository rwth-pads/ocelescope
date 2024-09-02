from dependentspy import dependentspy

if __name__ == "__main__":
    G = dependentspy(
        "./",
        name="ocean_dependencies",
        render_imports=True,
        prune=True,
        use_clusters=True,
        use_nested_clusters=True,
        min_cluster_size=1,
        show_3rdparty=False,
        show_builtin=False,
        summarize_external=True,
        ignore=["drafts*"],
        hide=["main", "index"],
        output_to_project=True,
        save_dot=True,
        render="if_changed",
        format="png",
        comment="ocean backend dependency graph",
        allow_local_imports=False,
    )
    G.view()
