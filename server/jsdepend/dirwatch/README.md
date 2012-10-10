dirwatch
========

Dirwatch is a utility that keeps a file system tree in memory and sunchronizes it with the file tree on disk.

There is a simple application to asses whether we can implement this reliably.

To run this application, run the following command from the directory you found this file in:

  node run-dirwatch.js
  
This will start a process watching all the files in the scripted source tree (i.e. ${current_dir}../..)

It is supposed to log the following kinds of events to the console:

created : path-to-file      #any time a new file appears in the tree
deleted : path-to-file      #any time a file is deleted from the tree
dir-created : path-to-dir   #any time a new sub-directory appears in the tree
dir-deleted : path-to-dir   #any time a directory is removed from the tree

You also should see an initial creation event for all files / dirs that exist in the watched directory when the watcher is intially started.

For manual testing: a few scenarios to test:

 - create a file in some existing subdir
 - delete a file in some existing subdir
 - create a new directory
 - create/delete some files in the new directory
 - drag and drop files and folders into the watched directory tree
 - drag and drop files and folders withing the watched directory tree
 - rename files and directories on the commandline (mv <old> <new>)
 - delete files and subdirectories on command line (rm -fr)
 - make sure to also test deletion of dir that has nested subdirs as a special case.
